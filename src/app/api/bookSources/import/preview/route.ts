import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { bookSources } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getUserId, unauthorized } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const { sources } = await request.json();
    if (!Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json({ error: "请提供书源列表" }, { status: 400 });
    }

    const db = getDb();

    const urls = sources
      .filter((s: Record<string, unknown>) => s.bookSourceUrl)
      .map((s: Record<string, unknown>) => s.bookSourceUrl as string);

    const existingMap = new Map<string, Record<string, unknown>>();
    if (urls.length > 0) {
      const existing = await db
        .select({ bookSourceUrl: bookSources.bookSourceUrl, lastUpdateTime: bookSources.lastUpdateTime })
        .from(bookSources)
        .where(
          and(eq(bookSources.userId, userId), inArray(bookSources.bookSourceUrl, urls))
        );

      for (const row of existing) {
        existingMap.set(row.bookSourceUrl, { lastUpdateTime: row.lastUpdateTime });
      }
    }

    const items = sources
      .filter((s: Record<string, unknown>) => s.bookSourceUrl && s.bookSourceName)
      .map((source: Record<string, unknown>) => {
        const existing = existingMap.get(source.bookSourceUrl as string);
        let status: "new" | "update" | "same" = "new";

        if (existing) {
          const existingTime = Number(existing.lastUpdateTime) || 0;
          const sourceTime = Number(source.lastUpdateTime) || 0;
          status = existingTime !== sourceTime ? "update" : "same";
        }

        return { source, status };
      });

    const stats = {
      new: items.filter((i) => i.status === "new").length,
      update: items.filter((i) => i.status === "update").length,
      same: items.filter((i) => i.status === "same").length,
      total: items.length,
    };

    return NextResponse.json({ items, stats });
  } catch (error) {
    console.error("Failed to preview book sources:", error);
    return NextResponse.json(
      { error: "预览书源失败" },
      { status: 500 }
    );
  }
}

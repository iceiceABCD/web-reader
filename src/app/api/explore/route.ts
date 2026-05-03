import { NextRequest, NextResponse } from "next/server";
import { getDb, dbToSource } from "@/lib/db";
import { bookSources } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createSourceExecutor, parseExploreUrl } from "@/lib/rule-engine";
import { getUserId, unauthorized } from "@/lib/auth-helpers";
import { rateLimiter, getClientId } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  if (!rateLimiter.check(getClientId(userId, "explore"), 20, 60_000)) {
    return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceUrl = searchParams.get("source");

    const db = getDb();

    if (!sourceUrl) {
      const sources = await db
        .select()
        .from(bookSources)
        .where(
          and(
            eq(bookSources.enabledExplore, true),
            eq(bookSources.userId, userId)
          )
        );

      const categories = sources
        .filter((s) => s.exploreUrl)
        .map((s) => ({
          sourceUrl: s.bookSourceUrl,
          sourceName: s.bookSourceName,
          categories: parseExploreUrl(s.exploreUrl || ""),
        }));

      return NextResponse.json(categories);
    }

    const source = await db
      .select()
      .from(bookSources)
      .where(
        and(
          eq(bookSources.bookSourceUrl, sourceUrl),
          eq(bookSources.userId, userId)
        )
      )
      .limit(1);

    if (!source.length) {
      return NextResponse.json(
        { error: "Source not found" },
        { status: 404 }
      );
    }

    const exploreUrl = searchParams.get("url");
    if (!exploreUrl) {
      const categories = parseExploreUrl(source[0].exploreUrl || "");
      return NextResponse.json(categories);
    }

    const page = parseInt(searchParams.get("page") || "1");
    const executor = await createSourceExecutor(dbToSource(source[0]));
    const results = await executor.explore(exploreUrl, page);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Explore failed:", error);
    return NextResponse.json(
      { error: "Explore failed" },
      { status: 500 }
    );
  }
}

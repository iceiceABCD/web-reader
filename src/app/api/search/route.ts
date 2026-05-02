import { NextRequest, NextResponse } from "next/server";
import { getDb, dbToSource } from "@/lib/db";
import { bookSources } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createSourceExecutor } from "@/lib/rule-engine";
import { getUserId, unauthorized } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get("key");
    const sourceUrl = searchParams.get("source");

    if (!key) {
      return NextResponse.json(
        { error: "Search key is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    let sources;
    if (sourceUrl) {
      sources = await db
        .select()
        .from(bookSources)
        .where(
          and(
            eq(bookSources.bookSourceUrl, sourceUrl),
            eq(bookSources.userId, userId)
          )
        );
    } else {
      sources = await db
        .select()
        .from(bookSources)
        .where(eq(bookSources.userId, userId));
    }

    const enabledSources = sources.filter((s) => s.enabled);

    const results: Array<Record<string, string> & { _sourceUrl: string }> = [];
    const concurrencyLimit = 5;
    const sourcesWithSearch = enabledSources.filter((s) => s.searchUrl);

    for (let i = 0; i < sourcesWithSearch.length; i += concurrencyLimit) {
      const batch = sourcesWithSearch.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.allSettled(
        batch.map(async (source) => {
          try {
            const executor = await createSourceExecutor(dbToSource(source));
            const books = await executor.search(key);
            return books.map((b) => ({
              ...b,
              _sourceUrl: source.bookSourceUrl,
            }));
          } catch (error) {
            console.error(`Search failed for source ${source.bookSourceUrl}:`, error);
            return [];
          }
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(...result.value);
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

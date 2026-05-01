import { NextRequest, NextResponse } from "next/server";
import { getDb, dbToSource } from "@/lib/db";
import { bookSources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createSourceExecutor, parseExploreUrl } from "@/lib/rule-engine";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceUrl = searchParams.get("source");

    const db = getDb();

    if (!sourceUrl) {
      const sources = await db
        .select()
        .from(bookSources)
        .where(eq(bookSources.enabledExplore, true));

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
      .where(eq(bookSources.bookSourceUrl, sourceUrl))
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

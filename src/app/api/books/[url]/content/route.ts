import { NextRequest, NextResponse } from "next/server";
import { getDb, dbToSource } from "@/lib/db";
import { chapters, books, bookSources, replaceRules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createSourceExecutor } from "@/lib/rule-engine";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ url: string }> }
) {
  try {
    const { url } = await params;
    const db = getDb();
    const decodedUrl = decodeURIComponent(url);
    const searchParams = request.nextUrl.searchParams;
    const index = parseInt(searchParams.get("index") || "0");

    const bookResult = await db
      .select()
      .from(books)
      .where(eq(books.bookUrl, decodedUrl))
      .limit(1);

    if (!bookResult.length) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const book = bookResult[0];
    const chapterResult = await db
      .select()
      .from(chapters)
      .where(eq(chapters.bookUrl, decodedUrl))
      .limit(1)
      .offset(index);

    if (!chapterResult.length) {
      return NextResponse.json(
        { error: "Chapter not found" },
        { status: 404 }
      );
    }

    const chapter = chapterResult[0];
    if (!chapter.url) {
      return NextResponse.json(
        { error: "Chapter URL is empty" },
        { status: 400 }
      );
    }

    const sourceResult = await db
      .select()
      .from(bookSources)
      .where(eq(bookSources.bookSourceUrl, book.origin))
      .limit(1);

    if (!sourceResult.length) {
      return NextResponse.json(
        { error: "Book source not found" },
        { status: 404 }
      );
    }

    const executor = await createSourceExecutor(dbToSource(sourceResult[0]));
    let content = await executor.getContent(chapter.url);

    const allReplaceRules = await db
      .select()
      .from(replaceRules)
      .where(eq(replaceRules.enabled, true));

    for (const rule of allReplaceRules) {
      if (rule.pattern) {
        try {
          if (rule.isRegex) {
            content = content.replace(
              new RegExp(rule.pattern, "g"),
              rule.replacement || ""
            );
          } else {
            content = content.replaceAll(rule.pattern, rule.replacement || "");
          }
        } catch {
          // skip invalid regex
        }
      }
    }

    return NextResponse.json({
      title: chapter.title,
      content,
      index: chapter.index,
      isVolume: chapter.isVolume,
    });
  } catch (error) {
    console.error("Failed to fetch content:", error);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
}

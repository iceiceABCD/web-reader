import { NextRequest, NextResponse } from "next/server";
import { getDb, dbToSource } from "@/lib/db";
import { chapters, books, bookSources, replaceRules, chapterContent } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createSourceExecutor } from "@/lib/rule-engine";
import { getUserId, unauthorized } from "@/lib/auth-helpers";

const MAX_CONTENT_LENGTH = 500_000;
const MAX_REGEX_LENGTH = 200;

function safeRegexReplace(
  content: string,
  pattern: string,
  replacement: string
): string {
  if (pattern.length > MAX_REGEX_LENGTH) return content;
  try {
    return content.replace(new RegExp(pattern, "g"), replacement);
  } catch {
    return content;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ url: string }> }
) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const { url } = await params;
    const db = getDb();
    const decodedUrl = decodeURIComponent(url);
    const searchParams = request.nextUrl.searchParams;
    const index = parseInt(searchParams.get("index") || "0");

    const bookResult = await db
      .select()
      .from(books)
      .where(
        and(eq(books.bookUrl, decodedUrl), eq(books.userId, userId))
      )
      .limit(1);

    if (!bookResult.length) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const book = bookResult[0];

    if (book.origin === "local") {
      const contentResult = await db
        .select()
        .from(chapterContent)
        .where(
          and(
            eq(chapterContent.bookUrl, decodedUrl),
            eq(chapterContent.userId, userId),
            eq(chapterContent.chapterIndex, index)
          )
        )
        .limit(1);

      let content = contentResult.length > 0 ? contentResult[0].content : "";

      const chapterResult = await db
        .select()
        .from(chapters)
        .where(
          and(
            eq(chapters.bookUrl, decodedUrl),
            eq(chapters.userId, userId),
            eq(chapters.index, index)
          )
        )
        .limit(1);

      const chapter = chapterResult[0] || { title: "", index, isVolume: false };

      if (content.length > MAX_CONTENT_LENGTH) {
        content = content.substring(0, MAX_CONTENT_LENGTH);
      }

      const allReplaceRules = await db
        .select()
        .from(replaceRules)
        .where(
          and(eq(replaceRules.enabled, true), eq(replaceRules.userId, userId))
        );

      for (const rule of allReplaceRules) {
        if (rule.pattern) {
          if (rule.isRegex) {
            content = safeRegexReplace(content, rule.pattern, rule.replacement || "");
          } else {
            content = content.replaceAll(rule.pattern, rule.replacement || "");
          }
        }
      }

      return NextResponse.json({
        title: chapter.title,
        content,
        index: chapter.index,
        isVolume: chapter.isVolume,
      });
    }

    const chapterResult = await db
      .select()
      .from(chapters)
      .where(
        and(
          eq(chapters.bookUrl, decodedUrl),
          eq(chapters.userId, userId),
          eq(chapters.index, index)
        )
      )
      .limit(1);

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
      .where(
        and(
          eq(bookSources.bookSourceUrl, book.origin),
          eq(bookSources.userId, userId)
        )
      )
      .limit(1);

    if (!sourceResult.length) {
      return NextResponse.json(
        { error: "Book source not found" },
        { status: 404 }
      );
    }

    const executor = await createSourceExecutor(dbToSource(sourceResult[0]));
    let content = await executor.getContent(chapter.url);

    if (content.length > MAX_CONTENT_LENGTH) {
      content = content.substring(0, MAX_CONTENT_LENGTH);
    }

    const allReplaceRules = await db
      .select()
      .from(replaceRules)
      .where(
        and(eq(replaceRules.enabled, true), eq(replaceRules.userId, userId))
      );

    for (const rule of allReplaceRules) {
      if (rule.pattern) {
        if (rule.isRegex) {
          content = safeRegexReplace(content, rule.pattern, rule.replacement || "");
        } else {
          content = content.replaceAll(rule.pattern, rule.replacement || "");
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

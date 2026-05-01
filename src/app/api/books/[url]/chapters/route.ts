import { NextRequest, NextResponse } from "next/server";
import { getDb, dbToSource } from "@/lib/db";
import { chapters, books, bookSources } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { createSourceExecutor } from "@/lib/rule-engine";
import { getUserId, unauthorized } from "@/lib/auth-helpers";

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
    const refresh = searchParams.get("refresh") === "true";

    if (!refresh) {
      const existing = await db
        .select()
        .from(chapters)
        .where(
          and(eq(chapters.bookUrl, decodedUrl), eq(chapters.userId, userId))
        )
        .orderBy(asc(chapters.index));

      if (existing.length > 0) {
        return NextResponse.json(existing);
      }
    }

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
    const tocUrl = book.tocUrl || book.bookUrl;
    const chapterList = await executor.getChapterList(tocUrl);

    if (chapterList.length > 0) {
      await db
        .delete(chapters)
        .where(
          and(eq(chapters.bookUrl, decodedUrl), eq(chapters.userId, userId))
        );

      const chapterValues = chapterList.map((ch) => ({
        url: ch.url,
        bookUrl: decodedUrl,
        userId,
        title: ch.title,
        index: ch.index,
        isVolume: ch.isVolume,
        isVip: ch.isVip,
        isPay: ch.isPay,
        resourceUrl: ch.resourceUrl,
        variable: ch.variable,
      }));

      await db.insert(chapters).values(chapterValues).onConflictDoNothing();

      await db
        .update(books)
        .set({ totalChapterNum: chapterList.length })
        .where(
          and(eq(books.bookUrl, decodedUrl), eq(books.userId, userId))
        );
    }

    return NextResponse.json(chapterList);
  } catch (error) {
    console.error("Failed to fetch chapters:", error);
    return NextResponse.json(
      { error: "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}

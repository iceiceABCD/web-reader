import { NextRequest, NextResponse } from "next/server";
import { getDb, dbToSource } from "@/lib/db";
import { chapters, books, bookSources } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
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
    const refresh = searchParams.get("refresh") === "true";

    if (!refresh) {
      const existing = await db
        .select()
        .from(chapters)
        .where(eq(chapters.bookUrl, decodedUrl))
        .orderBy(asc(chapters.index));

      if (existing.length > 0) {
        return NextResponse.json(existing);
      }
    }

    const bookResult = await db
      .select()
      .from(books)
      .where(eq(books.bookUrl, decodedUrl))
      .limit(1);

    if (!bookResult.length) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const book = bookResult[0];
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
    const tocUrl = book.tocUrl || book.bookUrl;
    const chapterList = await executor.getChapterList(tocUrl);

    if (chapterList.length > 0) {
      await db.delete(chapters).where(eq(chapters.bookUrl, decodedUrl));

      const chapterValues = chapterList.map((ch) => ({
        url: ch.url,
        bookUrl: decodedUrl,
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
        .where(eq(books.bookUrl, decodedUrl));
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

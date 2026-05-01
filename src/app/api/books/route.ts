import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();
    const bookList = await db
      .select()
      .from(books)
      .orderBy(desc(books.durChapterTime));
    return NextResponse.json(bookList);
  } catch (error) {
    console.error("Failed to fetch books:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    if (!body.bookUrl || !body.name) {
      return NextResponse.json(
        { error: "bookUrl and name are required" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(books)
      .values({
        bookUrl: body.bookUrl,
        tocUrl: body.tocUrl || "",
        origin: body.origin || "local",
        originName: body.originName || "",
        name: body.name,
        author: body.author || "",
        kind: body.kind,
        coverUrl: body.coverUrl,
        intro: body.intro,
        type: body.type ?? 0,
        latestChapterTitle: body.latestChapterTitle,
        totalChapterNum: body.totalChapterNum ?? 0,
        durChapterIndex: 0,
        durChapterPos: 0,
        durChapterTime: Date.now(),
        wordCount: body.wordCount,
        canUpdate: body.canUpdate ?? true,
        order: body.order ?? 0,
        variable: body.variable,
      })
      .onConflictDoUpdate({
        target: books.bookUrl,
        set: {
          name: body.name,
          author: body.author || "",
          kind: body.kind,
          coverUrl: body.coverUrl,
          intro: body.intro,
          latestChapterTitle: body.latestChapterTitle,
          totalChapterNum: body.totalChapterNum ?? 0,
          wordCount: body.wordCount,
          origin: body.origin,
          originName: body.originName,
          tocUrl: body.tocUrl || "",
          durChapterTime: Date.now(),
        },
      })
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Failed to save book:", error);
    return NextResponse.json(
      { error: "Failed to save book" },
      { status: 500 }
    );
  }
}

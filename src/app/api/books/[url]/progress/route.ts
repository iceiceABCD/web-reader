import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { books, readProgress } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ url: string }> }
) {
  try {
    const { url } = await params;
    const db = getDb();
    const decodedUrl = decodeURIComponent(url);
    const body = await request.json();

    const durChapterIndex = body.durChapterIndex ?? 0;
    const durChapterPos = body.durChapterPos ?? 0;

    await db
      .update(books)
      .set({
        durChapterIndex,
        durChapterPos,
        durChapterTime: Date.now(),
      })
      .where(eq(books.bookUrl, decodedUrl));

    await db
      .insert(readProgress)
      .values({
        bookUrl: decodedUrl,
        durChapterIndex,
        durChapterPos,
      })
      .onConflictDoUpdate({
        target: readProgress.bookUrl,
        set: {
          durChapterIndex,
          durChapterPos,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save progress:", error);
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}

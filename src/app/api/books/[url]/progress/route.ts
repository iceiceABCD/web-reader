import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { books, readProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId, unauthorized } from "@/lib/auth-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ url: string }> }
) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const { url } = await params;
    const db = getDb();
    const decodedUrl = decodeURIComponent(url);
    const body = await request.json();

    const durChapterIndex = body.durChapterIndex ?? 0;
    const durChapterPos = body.durChapterPos ?? 0;

    await db.transaction(async (tx) => {
      await tx
        .update(books)
        .set({
          durChapterIndex,
          durChapterPos,
          durChapterTime: Date.now(),
        })
        .where(
          and(eq(books.bookUrl, decodedUrl), eq(books.userId, userId))
        );

      await tx
        .insert(readProgress)
        .values({
          bookUrl: decodedUrl,
          userId,
          durChapterIndex,
          durChapterPos,
        })
        .onConflictDoUpdate({
          target: [readProgress.bookUrl, readProgress.userId],
          set: {
            durChapterIndex,
            durChapterPos,
            updatedAt: new Date(),
          },
        });
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

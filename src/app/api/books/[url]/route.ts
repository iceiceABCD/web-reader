import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId, unauthorized } from "@/lib/auth-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ url: string }> }
) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const { url } = await params;
    const db = getDb();
    const decodedUrl = decodeURIComponent(url);
    const book = await db
      .select()
      .from(books)
      .where(
        and(eq(books.bookUrl, decodedUrl), eq(books.userId, userId))
      )
      .limit(1);

    if (!book.length) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }
    return NextResponse.json(book[0]);
  } catch (error) {
    console.error("Failed to fetch book:", error);
    return NextResponse.json(
      { error: "Failed to fetch book" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ url: string }> }
) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const { url } = await params;
    const db = getDb();
    const decodedUrl = decodeURIComponent(url);
    await db
      .delete(books)
      .where(
        and(eq(books.bookUrl, decodedUrl), eq(books.userId, userId))
      );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete book:", error);
    return NextResponse.json(
      { error: "Failed to delete book" },
      { status: 500 }
    );
  }
}

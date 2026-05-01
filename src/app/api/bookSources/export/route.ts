import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { bookSources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserId, unauthorized } from "@/lib/auth-helpers";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const db = getDb();
    const sources = await db
      .select()
      .from(bookSources)
      .where(eq(bookSources.userId, userId));
    return NextResponse.json(sources);
  } catch (error) {
    console.error("Failed to export book sources:", error);
    return NextResponse.json(
      { error: "Failed to export book sources" },
      { status: 500 }
    );
  }
}

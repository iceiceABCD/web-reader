import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { bookSources } from "@/lib/db/schema";

export async function GET() {
  try {
    const db = getDb();
    const sources = await db.select().from(bookSources);
    return NextResponse.json(sources);
  } catch (error) {
    console.error("Failed to export book sources:", error);
    return NextResponse.json(
      { error: "Failed to export book sources" },
      { status: 500 }
    );
  }
}

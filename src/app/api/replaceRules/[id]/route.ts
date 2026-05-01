import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { replaceRules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();

    const result = await db
      .update(replaceRules)
      .set({
        name: body.name,
        group: body.group,
        pattern: body.pattern,
        replacement: body.replacement,
        isRegex: body.isRegex,
        scope: body.scope,
        enabled: body.enabled,
        sortOrder: body.sortOrder,
      })
      .where(eq(replaceRules.id, parseInt(id)))
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Failed to update replace rule:", error);
    return NextResponse.json(
      { error: "Failed to update replace rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    await db
      .delete(replaceRules)
      .where(eq(replaceRules.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete replace rule:", error);
    return NextResponse.json(
      { error: "Failed to delete replace rule" },
      { status: 500 }
    );
  }
}

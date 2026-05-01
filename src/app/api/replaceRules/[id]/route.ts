import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { replaceRules } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId, unauthorized } from "@/lib/auth-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

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
      .where(
        and(eq(replaceRules.id, parseInt(id)), eq(replaceRules.userId, userId))
      )
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
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const { id } = await params;
    const db = getDb();
    await db
      .delete(replaceRules)
      .where(
        and(eq(replaceRules.id, parseInt(id)), eq(replaceRules.userId, userId))
      );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete replace rule:", error);
    return NextResponse.json(
      { error: "Failed to delete replace rule" },
      { status: 500 }
    );
  }
}

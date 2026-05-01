import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { replaceRules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserId, unauthorized } from "@/lib/auth-helpers";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const db = getDb();
    const rules = await db
      .select()
      .from(replaceRules)
      .where(eq(replaceRules.userId, userId));
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Failed to fetch replace rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch replace rules" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const db = getDb();
    const body = await request.json();

    if (!body.name || !body.pattern) {
      return NextResponse.json(
        { error: "name and pattern are required" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(replaceRules)
      .values({
        userId,
        name: body.name,
        group: body.group,
        pattern: body.pattern,
        replacement: body.replacement || "",
        isRegex: body.isRegex ?? false,
        scope: body.scope,
        enabled: body.enabled ?? true,
        sortOrder: body.sortOrder ?? 0,
      })
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Failed to create replace rule:", error);
    return NextResponse.json(
      { error: "Failed to create replace rule" },
      { status: 500 }
    );
  }
}

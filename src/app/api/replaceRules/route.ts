import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { replaceRules } from "@/lib/db/schema";

export async function GET() {
  try {
    const db = getDb();
    const rules = await db.select().from(replaceRules);
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

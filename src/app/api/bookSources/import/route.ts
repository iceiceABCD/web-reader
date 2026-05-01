import { NextRequest, NextResponse } from "next/server";
import { getUserId, unauthorized } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json();
    const sources = Array.isArray(body) ? body : [body];

    const importUrl = `${
      process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || ""
    }/api/bookSources`;
    const response = await fetch(importUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify(sources),
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error("Failed to import book sources:", error);
    return NextResponse.json(
      { error: "Failed to import book sources" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { bookSources } from "@/lib/db/schema";
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
    const source = await db
      .select()
      .from(bookSources)
      .where(
        and(
          eq(bookSources.bookSourceUrl, decodedUrl),
          eq(bookSources.userId, userId)
        )
      )
      .limit(1);

    if (!source.length) {
      return NextResponse.json(
        { error: "Book source not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(source[0]);
  } catch (error) {
    console.error("Failed to fetch book source:", error);
    return NextResponse.json(
      { error: "Failed to fetch book source" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const result = await db
      .update(bookSources)
      .set({
        bookSourceName: body.bookSourceName,
        bookSourceGroup: body.bookSourceGroup,
        bookSourceType: body.bookSourceType,
        bookUrlPattern: body.bookUrlPattern,
        customOrder: body.customOrder,
        enabled: body.enabled,
        enabledExplore: body.enabledExplore,
        enabledCookieJar: body.enabledCookieJar,
        concurrentRate: body.concurrentRate,
        header: body.header,
        loginUrl: body.loginUrl,
        loginUi: body.loginUi,
        loginCheckJs: body.loginCheckJs,
        bookSourceComment: body.bookSourceComment,
        variableComment: body.variableComment,
        exploreUrl: body.exploreUrl,
        searchUrl: body.searchUrl,
        ruleSearch: body.ruleSearch,
        ruleExplore: body.ruleExplore,
        ruleBookInfo: body.ruleBookInfo,
        ruleToc: body.ruleToc,
        ruleContent: body.ruleContent,
        ruleReview: body.ruleReview,
        lastUpdateTime: Date.now(),
      })
      .where(
        and(
          eq(bookSources.bookSourceUrl, decodedUrl),
          eq(bookSources.userId, userId)
        )
      )
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Failed to update book source:", error);
    return NextResponse.json(
      { error: "Failed to update book source" },
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
      .delete(bookSources)
      .where(
        and(
          eq(bookSources.bookSourceUrl, decodedUrl),
          eq(bookSources.userId, userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete book source:", error);
    return NextResponse.json(
      { error: "Failed to delete book source" },
      { status: 500 }
    );
  }
}

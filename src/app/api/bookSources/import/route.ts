import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { bookSources } from "@/lib/db/schema";
import { getUserId, unauthorized } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json();
    const sources = Array.isArray(body) ? body : [body];

    if (sources.length > 500) {
      return NextResponse.json(
        { error: "一次最多导入500个书源" },
        { status: 400 }
      );
    }

    const db = getDb();
    const results = [];

    for (const source of sources) {
      if (!source.bookSourceUrl || !source.bookSourceName) continue;

      const result = await db
        .insert(bookSources)
        .values({
          bookSourceUrl: source.bookSourceUrl,
          userId,
          bookSourceName: source.bookSourceName,
          bookSourceGroup: source.bookSourceGroup,
          bookSourceType: source.bookSourceType ?? 0,
          bookUrlPattern: source.bookUrlPattern,
          customOrder: source.customOrder ?? 0,
          enabled: source.enabled ?? true,
          enabledExplore: source.enabledExplore ?? true,
          enabledCookieJar: source.enabledCookieJar,
          concurrentRate: source.concurrentRate,
          header: source.header,
          loginUrl: source.loginUrl,
          loginUi: source.loginUi,
          loginCheckJs: source.loginCheckJs,
          bookSourceComment: source.bookSourceComment,
          variableComment: source.variableComment,
          lastUpdateTime: source.lastUpdateTime ?? 0,
          respondTime: source.respondTime ?? 180000,
          weight: source.weight ?? 0,
          exploreUrl: source.exploreUrl,
          searchUrl: source.searchUrl,
          ruleSearch: source.ruleSearch,
          ruleExplore: source.ruleExplore,
          ruleBookInfo: source.ruleBookInfo,
          ruleToc: source.ruleToc,
          ruleContent: source.ruleContent,
          ruleReview: source.ruleReview,
        })
        .onConflictDoUpdate({
          target: [bookSources.bookSourceUrl, bookSources.userId],
          set: {
            bookSourceName: source.bookSourceName,
            bookSourceGroup: source.bookSourceGroup,
            bookSourceType: source.bookSourceType ?? 0,
            bookUrlPattern: source.bookUrlPattern,
            customOrder: source.customOrder ?? 0,
            enabled: source.enabled ?? true,
            enabledExplore: source.enabledExplore ?? true,
            enabledCookieJar: source.enabledCookieJar,
            concurrentRate: source.concurrentRate,
            header: source.header,
            loginUrl: source.loginUrl,
            loginUi: source.loginUi,
            loginCheckJs: source.loginCheckJs,
            bookSourceComment: source.bookSourceComment,
            variableComment: source.variableComment,
            lastUpdateTime: source.lastUpdateTime ?? 0,
            respondTime: source.respondTime ?? 180000,
            weight: source.weight ?? 0,
            exploreUrl: source.exploreUrl,
            searchUrl: source.searchUrl,
            ruleSearch: source.ruleSearch,
            ruleExplore: source.ruleExplore,
            ruleBookInfo: source.ruleBookInfo,
            ruleToc: source.ruleToc,
            ruleContent: source.ruleContent,
            ruleReview: source.ruleReview,
          },
        })
        .returning();
      results.push(result[0]);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Failed to import book sources:", error);
    return NextResponse.json(
      { error: "Failed to import book sources" },
      { status: 500 }
    );
  }
}
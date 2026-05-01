import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { bookSources } from "@/lib/db/schema";
import { eq, like, or, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const group = searchParams.get("group");
    const enabledOnly = searchParams.get("enabled") === "true";

    let query = db.select().from(bookSources).$dynamic();

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(bookSources.bookSourceName, `%${search}%`),
          like(bookSources.bookSourceUrl, `%${search}%`)
        )!
      );
    }
    if (group) {
      conditions.push(like(bookSources.bookSourceGroup, `%${group}%`));
    }
    if (enabledOnly) {
      conditions.push(eq(bookSources.enabled, true));
    }

    if (conditions.length > 0) {
      query = query.where(sql.join(conditions, sql` AND `));
    }

    const sources = await query.orderBy(bookSources.customOrder);
    return NextResponse.json(sources);
  } catch (error) {
    console.error("Failed to fetch book sources:", error);
    return NextResponse.json(
      { error: "Failed to fetch book sources" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const sources = Array.isArray(body) ? body : [body];

    const results = [];
    for (const source of sources) {
      if (!source.bookSourceUrl || !source.bookSourceName) continue;

      const result = await db
        .insert(bookSources)
        .values({
          bookSourceUrl: source.bookSourceUrl,
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
          target: bookSources.bookSourceUrl,
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
    console.error("Failed to save book sources:", error);
    return NextResponse.json(
      { error: "Failed to save book sources" },
      { status: 500 }
    );
  }
}

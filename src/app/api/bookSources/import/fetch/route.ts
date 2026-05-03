import { NextRequest, NextResponse } from "next/server";
import { getUserId, unauthorized } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "请提供有效的URL" }, { status: 400 });
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return NextResponse.json({ error: "URL必须以 http:// 或 https:// 开头" }, { status: 400 });
    }

    const sources = await fetchAndParseUrl(url);
    return NextResponse.json(sources);
  } catch (error) {
    console.error("Failed to fetch book source URL:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取书源失败" },
      { status: 500 }
    );
  }
}

async function fetchAndParseUrl(url: string, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`请求失败: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    let json;

    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("返回内容不是有效的 JSON 格式");
    }

    return resolveSources(json);
  } finally {
    clearTimeout(timer);
  }
}

async function resolveSources(json: unknown): Promise<{
  sources: Record<string, unknown>[];
  warnings: string[];
}> {
  const warnings: string[] = [];

  if (isSourceUrlsFormat(json)) {
    const urls = json.sourceUrls as string[];
    if (urls.length > 20) {
      throw new Error("sourceUrls 中的链接数量不能超过 20 个");
    }

    const results = await Promise.allSettled(
      urls.map((u) => fetchAndParseUrl(u, 8000))
    );

    const allSources: Record<string, unknown>[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") {
        allSources.push(...r.value.sources);
        warnings.push(...r.value.warnings);
      } else {
        warnings.push(`URL #${i + 1} 获取失败: ${r.reason?.message || "未知错误"}`);
      }
    }

    return { sources: allSources, warnings };
  }

  if (Array.isArray(json)) {
    const sources = json.filter(isBookSourceObject);
    if (sources.length === 0) {
      throw new Error("未找到有效的书源数据");
    }
    return { sources, warnings };
  }

  if (isBookSourceObject(json)) {
    return { sources: [json as Record<string, unknown>], warnings };
  }

  throw new Error("无法识别的 JSON 格式，请确认是 Legado 书源格式");
}

function isSourceUrlsFormat(json: unknown): json is { sourceUrls: string[] } {
  return (
    typeof json === "object" &&
    json !== null &&
    "sourceUrls" in json &&
    Array.isArray((json as { sourceUrls: unknown }).sourceUrls) &&
    !("bookSourceUrl" in json)
  );
}

function isBookSourceObject(obj: unknown): boolean {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "bookSourceUrl" in obj &&
    "bookSourceName" in obj
  );
}

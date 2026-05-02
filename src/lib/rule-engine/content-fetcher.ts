import { ofetch } from "ofetch";
import iconv from "iconv-lite";

export interface FetchOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  charset?: string;
  timeout?: number;
  cookie?: string;
}

export interface FetchResult {
  content: string;
  url: string;
  isJson: boolean;
  jsonData?: unknown;
}

export async function fetchContent(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const {
    method = "GET",
    headers = {},
    body,
    charset,
    timeout = 10000,
    cookie,
  } = options;

  const defaultHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  };

  const mergedHeaders = { ...defaultHeaders, ...headers };
  if (cookie) {
    mergedHeaders["Cookie"] = cookie;
  }

  try {
    const response = await ofetch.raw(url, {
      method,
      headers: mergedHeaders,
      body,
      timeout,
      redirect: "follow",
      responseType: "arrayBuffer",
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType =
      response.headers.get("content-type") || "";

    let encoding = charset;
    if (!encoding) {
      const charsetMatch = contentType.match(/charset=([^\s;]+)/i);
      if (charsetMatch) {
        encoding = charsetMatch[1].trim().toLowerCase();
      }
      if (!encoding) {
        const metaMatch = buffer
          .toString("utf-8", 0, Math.min(buffer.length, 2048))
          .match(/charset=["']?([^"'\s;>]+)/i);
        if (metaMatch) {
          encoding = metaMatch[1].trim().toLowerCase().replace(/["']/g, "");
        }
      }
    }

    encoding = encoding || "utf-8";
    if (encoding === "gb2312" || encoding === "gbk") {
      encoding = "gbk";
    }

    let content: string;
    if (iconv.encodingExists(encoding)) {
      content = iconv.decode(buffer, encoding);
    } else {
      content = buffer.toString("utf-8");
    }

    const isJson =
      contentType.includes("application/json") ||
      content.trim().startsWith("{") ||
      content.trim().startsWith("[");

    let jsonData: unknown;
    if (isJson) {
      try {
        jsonData = JSON.parse(content);
      } catch {
        // not valid JSON
      }
    }

    return {
      content,
      url: response.url || url,
      isJson,
      jsonData,
    };
  } catch (error) {
    throw new Error(
      `Fetch failed: ${url} - ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

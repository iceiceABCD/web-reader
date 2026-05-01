export interface ParsedSearchUrl {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: string;
  charset?: string;
}

export function parseSearchUrl(
  searchUrl: string,
  variables: Record<string, string> = {}
): ParsedSearchUrl {
  let url = searchUrl;
  let method: "GET" | "POST" = "GET";
  let headers: Record<string, string> = {};
  let body: string | undefined;
  let charset: string | undefined;

  const postMatch = url.match(/^(.+?),\s*(\{.*\})\s*$/);
  if (postMatch) {
    url = postMatch[1];
    try {
      const config = JSON.parse(postMatch[2]);
      method = (config.method || "GET").toUpperCase() as "GET" | "POST";
      if (config.body) {
        body = config.body;
      }
      if (config.charset) {
        charset = config.charset;
      }
      if (config.headers) {
        headers = config.headers;
      }
      if (config.webJs) {
        // web JS is not supported in server environment
      }
    } catch {
      // if not valid JSON, treat as plain body
      body = postMatch[2];
      method = "POST";
    }
  }

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    url = url.replace(placeholder, encodeURIComponent(value));
    if (body) {
      body = body.replace(placeholder, encodeURIComponent(value));
    }
  }

  const pageMatch = url.match(/,\s*page\s*=\s*(\d+)/);
  if (pageMatch) {
    url = url.replace(/,\s*page\s*=\s*\d+/, "");
  }

  return { url, method, headers, body, charset };
}

export function resolveUrl(base: string, relative: string): string {
  if (!relative) return base;
  if (relative.startsWith("http://") || relative.startsWith("https://")) {
    return relative;
  }
  if (relative.startsWith("//")) {
    const protocol = base.startsWith("https") ? "https:" : "http:";
    return protocol + relative;
  }
  if (relative.startsWith("/")) {
    const urlObj = new URL(base);
    return `${urlObj.protocol}//${urlObj.host}${relative}`;
  }
  const urlObj = new URL(base);
  const path = urlObj.pathname;
  const dir = path.substring(0, path.lastIndexOf("/") + 1);
  return `${urlObj.protocol}//${urlObj.host}${dir}${relative}`;
}

export function parseExploreUrl(exploreUrl: string): Array<{
  title: string;
  url: string;
}> {
  const categories: Array<{ title: string; url: string }> = [];
  if (!exploreUrl) return categories;

  const lines = exploreUrl.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const sepIdx = trimmed.indexOf("::");
    if (sepIdx > 0) {
      categories.push({
        title: trimmed.substring(0, sepIdx).trim(),
        url: trimmed.substring(sepIdx + 2).trim(),
      });
    } else {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx > 0 && !trimmed.startsWith("http")) {
        categories.push({
          title: trimmed.substring(0, colonIdx).trim(),
          url: trimmed.substring(colonIdx + 1).trim(),
        });
      } else {
        categories.push({ title: trimmed, url: trimmed });
      }
    }
  }
  return categories;
}

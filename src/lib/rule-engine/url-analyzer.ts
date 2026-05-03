export interface ParsedSearchUrl {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: string;
  charset?: string;
}

/**
 * Parse a Legado-style search URL.
 *
 * Supported formats:
 * 1. Plain URL: "https://example.com/search?q={{key}}&page={{page}}"
 * 2. URL with JSON config: "https://example.com/search, {\"method\":\"POST\",\"body\":\"q={{key}}\"}"
 * 3. @js: prefix: "@js:var url=...; url"  (JS must be executed BEFORE calling this)
 *
 * Template variables {{key}}, {{page}}, etc. are replaced before JSON config extraction.
 */
export function parseSearchUrl(
  searchUrl: string,
  variables: Record<string, string> = {},
  baseUrl: string = ""
): ParsedSearchUrl {
  let url = searchUrl.trim();
  let method: "GET" | "POST" = "GET";
  let headers: Record<string, string> = {};
  let body: string | undefined;
  let charset: string | undefined;

  // Step 1: Replace template variables
  url = replaceVariables(url, variables);

  // Step 2: Extract JSON config from URL tail
  // Format: "url, {json config}" or "url,{json config}"
  const configMatch = url.match(/^(.+?),\s*(\{[\s\S]*\})\s*$/);
  if (configMatch) {
    url = configMatch[1].trim();
    try {
      const config = JSON.parse(configMatch[2]);
      if (config.method) {
        method = String(config.method).toUpperCase() as "GET" | "POST";
      }
      if (config.body) {
        body = replaceVariables(String(config.body), variables);
      }
      if (config.charset) {
        charset = String(config.charset);
      }
      if (config.headers && typeof config.headers === "object") {
        for (const [k, v] of Object.entries(config.headers)) {
          headers[k] = String(v);
        }
      }
    } catch {
      // Not valid JSON config, treat everything as URL
      url = searchUrl.trim();
    }
  }

  // Step 3: Resolve relative URL against baseUrl
  if (baseUrl) {
    url = resolveUrl(baseUrl, url);
  }

  // Step 4: Replace remaining template variables in body
  if (body) {
    body = replaceVariables(body, variables);
  }

  return { url, method, headers, body, charset };
}

function replaceVariables(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{([\w.-]+)\}\}/g, (_, key) => {
    return variables[key] ?? "";
  });
}

export function resolveUrl(base: string, relative: string): string {
  if (!relative) return base;
  if (relative.startsWith("http://") || relative.startsWith("https://")) {
    return relative;
  }
  if (relative.startsWith("//")) {
    const protocol = base.startsWith("https://") ? "https:" : "http:";
    return protocol + relative;
  }
  try {
    if (relative.startsWith("/")) {
      const urlObj = new URL(base);
      return `${urlObj.protocol}//${urlObj.host}${relative}`;
    }
    const urlObj = new URL(base);
    const path = urlObj.pathname;
    const dir = path.substring(0, path.lastIndexOf("/") + 1);
    return `${urlObj.protocol}//${urlObj.host}${dir}${relative}`;
  } catch {
    return base + relative;
  }
}

interface ExploreCategory {
  title: string;
  url: string;
}

/**
 * Parse exploreUrl into categories.
 *
 * Supported formats:
 * 1. "title::url" pairs (one per line)
 * 2. "title:url" pairs (one per line, only if title doesn't start with http)
 * 3. JSON array: [{"title":"玄幻","url":"http://...","style":{...}}]
 * 4. Plain URL (used as both title and url)
 */
export function parseExploreUrl(exploreUrl: string): ExploreCategory[] {
  if (!exploreUrl) return [];

  const trimmed = exploreUrl.trim();

  // Try JSON array format
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) {
        return arr
          .filter(
            (item: unknown) =>
              typeof item === "object" && item !== null && "title" in item && "url" in item
          )
          .map((item: Record<string, unknown>) => ({
            title: String(item.title),
            url: String(item.url),
          }));
      }
    } catch {
      // Not valid JSON, fall through
    }
  }

  // Try JSON object with sourceUrls (some sources use this for explore too)
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed);
      if (Array.isArray(obj.sourceUrls)) {
        return [];
      }
    } catch {
      // Not valid JSON
    }
  }

  // Line-by-line format: "title::url" or "title:url"
  const categories: ExploreCategory[] = [];
  const lines = trimmed.split("\n");
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;

    const sepIdx = l.indexOf("::");
    if (sepIdx > 0) {
      categories.push({
        title: l.substring(0, sepIdx).trim(),
        url: l.substring(sepIdx + 2).trim(),
      });
    } else {
      const colonIdx = l.indexOf(":");
      if (colonIdx > 0 && !l.startsWith("http")) {
        categories.push({
          title: l.substring(0, colonIdx).trim(),
          url: l.substring(colonIdx + 1).trim(),
        });
      } else {
        categories.push({ title: l, url: l });
      }
    }
  }
  return categories;
}

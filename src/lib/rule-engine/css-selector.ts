import * as cheerio from "cheerio";

export function queryByCss(
  html: string,
  selector: string,
  attr?: string
): string[] {
  const $ = cheerio.load(html);
  const elements = $(selector);
  const results: string[] = [];

  elements.each((_, el) => {
    if (attr === "html") {
      results.push($(el).html() || "");
    } else if (attr === "outerHtml") {
      results.push($.html($(el)) || "");
    } else if (attr) {
      const val = $(el).attr(attr);
      if (val) results.push(val);
    } else {
      const text = $(el).text().trim();
      if (text) results.push(text);
    }
  });

  return results;
}

export function queryByCssFirst(
  html: string,
  selector: string,
  attr?: string
): string {
  const results = queryByCss(html, selector, attr);
  return results[0] ?? "";
}

export function extractByCss(
  html: string,
  rule: string
): string | string[] {
  const attrMatch = rule.match(/@([a-zA-Z-]+)$/);
  let selector = rule;
  let attr: string | undefined;

  if (attrMatch) {
    selector = rule.substring(0, rule.lastIndexOf("@"));
    attr = attrMatch[1];
  }

  const attrMap: Record<string, string | undefined> = {
    href: "href",
    src: "src",
    text: undefined,
    html: "html",
    outerHtml: "outerHtml",
    content: undefined,
    title: "title",
    alt: "alt",
    dataSrc: "data-src",
    dataOriginal: "data-original",
  };

  const resolvedAttr = attrMap[attr ?? ""] ?? attr;

  if (attr === "text" || !attr) {
    return queryByCss(html, selector);
  }
  return queryByCss(html, selector, resolvedAttr);
}

export function extractListByCss(html: string, listSelector: string): unknown[] {
  const $ = cheerio.load(html);
  return $(listSelector).toArray().map((el) => $(el).html() || "");
}

export function getElementHtml($: cheerio.CheerioAPI, el: unknown): string {
  return $($(el as ReturnType<typeof $>)).html() || "";
}

export function getElementText($: cheerio.CheerioAPI, el: unknown): string {
  return $($(el as ReturnType<typeof $>)).text().trim();
}

export function getElementAttr($: cheerio.CheerioAPI, el: unknown, attr: string): string {
  return $($(el as ReturnType<typeof $>)).attr(attr) || "";
}

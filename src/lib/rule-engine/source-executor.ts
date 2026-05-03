import vm from "node:vm";
import type { BookSource, BookChapter, SearchRule } from "@/lib/types";
import type { RuleContext, ParsedRule } from "./parser";
import { parseRule, processTemplate, processPutAndGet } from "./parser";
import { extractByCss, extractListByCss, getElementHtml } from "./css-selector";
import { queryByJsonPath, queryByJsonPathString } from "./jsonpath";
import { fetchContent, type FetchOptions } from "./content-fetcher";
import { parseSearchUrl, resolveUrl, parseExploreUrl } from "./url-analyzer";
import * as cheerio from "cheerio";

export class SourceExecutor {
  private source: BookSource;
  private variableMap: Record<string, string>;

  constructor(source: BookSource) {
    this.source = source;
    this.variableMap = {};
  }

  getSource(): BookSource {
    return this.source;
  }

  async search(
    key: string,
    page: number = 1
  ): Promise<Array<Record<string, string>>> {
    if (!this.source.searchUrl) return [];

    const variables: Record<string, string> = {
      key,
      page: String(page),
      keyword: key,
      searchKey: encodeURIComponent(key),
    };

    // Resolve searchUrl — may contain @js: prefix, relative paths, JSON config
    let searchUrlStr = this.source.searchUrl;

    // Handle @js: prefix: execute JS to get the actual URL
    if (searchUrlStr.trim().startsWith("@js:")) {
      const jsCode = searchUrlStr.trim().substring(4);
      const jsResult = this.evalJs(jsCode, {
        ...variables,
        baseUrl: this.source.bookSourceUrl,
      });
      if (jsResult) searchUrlStr = jsResult;
    }

    const parsed = parseSearchUrl(
      searchUrlStr,
      variables,
      this.source.bookSourceUrl
    );
    const fetchOptions: FetchOptions = {
      method: parsed.method,
      headers: { ...this.getHeaders(), ...parsed.headers },
      body: parsed.body,
      charset: parsed.charset,
    };

    const result = await fetchContent(parsed.url, fetchOptions);
    const ruleSearch = this.source.ruleSearch;
    if (!ruleSearch || !ruleSearch.bookList) return [];

    const context: RuleContext = {
      baseUrl: this.source.bookSourceUrl,
      variableMap: this.variableMap,
    };

    const bookList = this.extractList(
      result.isJson ? result.jsonData : result.content,
      ruleSearch.bookList,
      context
    );

    return bookList.map((item) => this.extractBookFields(item, ruleSearch, context));
  }

  async getBookInfo(
    bookUrl: string
  ): Promise<Record<string, string> | null> {
    const ruleBookInfo = this.source.ruleBookInfo;
    if (!ruleBookInfo) return null;

    const fetchOptions: FetchOptions = {
      headers: this.getHeaders(),
    };
    const result = await fetchContent(bookUrl, fetchOptions);

    const context: RuleContext = {
      baseUrl: bookUrl,
      variableMap: this.variableMap,
    };

    const content = result.isJson ? result.jsonData : result.content;
    const info: Record<string, string> = { bookUrl };

    if (ruleBookInfo.init) {
      this.evaluateRule(content, ruleBookInfo.init, context);
    }

    const fields: Array<{ key: string; rule?: string }> = [
      { key: "name", rule: ruleBookInfo.name },
      { key: "author", rule: ruleBookInfo.author },
      { key: "intro", rule: ruleBookInfo.intro },
      { key: "kind", rule: ruleBookInfo.kind },
      { key: "lastChapter", rule: ruleBookInfo.lastChapter },
      { key: "updateTime", rule: ruleBookInfo.updateTime },
      { key: "coverUrl", rule: ruleBookInfo.coverUrl },
      { key: "tocUrl", rule: ruleBookInfo.tocUrl },
      { key: "wordCount", rule: ruleBookInfo.wordCount },
    ];

    for (const field of fields) {
      if (field.rule) {
        const value = this.evaluateRuleString(content, field.rule, context);
        if (value) {
          if (field.key === "coverUrl" || field.key === "tocUrl") {
            info[field.key] = resolveUrl(bookUrl, value);
          } else {
            info[field.key] = value;
          }
        }
      }
    }

    return info;
  }

  async getChapterList(
    tocUrl: string,
    maxPages: number = 20
  ): Promise<BookChapter[]> {
    const ruleToc = this.source.ruleToc;
    if (!ruleToc || !ruleToc.chapterList) return [];

    const fetchOptions: FetchOptions = {
      headers: this.getHeaders(),
    };

    let currentUrl = tocUrl;
    let allChapters: BookChapter[] = [];
    let pageCount = 0;

    while (currentUrl && pageCount < maxPages) {
      const result = await fetchContent(currentUrl, fetchOptions);
      const context: RuleContext = {
        baseUrl: currentUrl,
        variableMap: this.variableMap,
      };

      const content = result.isJson ? result.jsonData : result.content;
      const chapterElements = this.extractList(
        content,
        ruleToc.chapterList,
        context
      );

      const chapters: BookChapter[] = chapterElements.map((item, idx) => {
        const chapterContext: RuleContext = {
          baseUrl: currentUrl,
          variableMap: this.variableMap,
        };

        const name = ruleToc.chapterName
          ? this.evaluateRuleString(item, ruleToc.chapterName, chapterContext)
          : `Chapter ${idx + 1}`;
        let chapterUrl = ruleToc.chapterUrl
          ? this.evaluateRuleString(item, ruleToc.chapterUrl, chapterContext)
          : "";

        if (chapterUrl) {
          chapterUrl = resolveUrl(currentUrl, chapterUrl);
        }

        const isVolume = ruleToc.isVolume
          ? this.evaluateRuleString(item, ruleToc.isVolume, chapterContext) === "true"
          : false;
        const isVip = ruleToc.isVip
          ? this.evaluateRuleString(item, ruleToc.isVip, chapterContext) === "true"
          : false;
        const isPay = ruleToc.isPay
          ? this.evaluateRuleString(item, ruleToc.isPay, chapterContext) === "true"
          : false;

        return {
          url: chapterUrl,
          title: name,
          isVolume,
          baseUrl: currentUrl,
          bookUrl: "",
          index: allChapters.length + idx,
          isVip,
          isPay,
        };
      });

      allChapters = allChapters.concat(chapters);

      if (ruleToc.nextTocUrl) {
        const nextUrl = this.evaluateRuleString(
          content,
          ruleToc.nextTocUrl,
          context
        );
        if (nextUrl) {
          const resolvedNext = resolveUrl(currentUrl, nextUrl);
          if (resolvedNext !== currentUrl) {
            currentUrl = resolvedNext;
            pageCount++;
          } else {
            break;
          }
        } else {
          break;
        }
      } else {
        break;
      }
    }

    allChapters.forEach((ch, idx) => {
      ch.index = idx;
    });

    return allChapters;
  }

  async getContent(
    chapterUrl: string,
    maxPages: number = 10
  ): Promise<string> {
    const ruleContent = this.source.ruleContent;
    if (!ruleContent || !ruleContent.content) return "";

    const fetchOptions: FetchOptions = {
      headers: this.getHeaders(),
    };

    let currentUrl = chapterUrl;
    const allContent: string[] = [];
    let pageCount = 0;

    while (currentUrl && pageCount < maxPages) {
      const result = await fetchContent(currentUrl, fetchOptions);
      const context: RuleContext = {
        baseUrl: currentUrl,
        variableMap: this.variableMap,
      };

      const content = result.isJson ? result.jsonData : result.content;
      const text = this.evaluateRuleString(
        content,
        ruleContent.content,
        context
      );

      if (text) {
        allContent.push(text);
      }

      if (ruleContent.nextContentUrl) {
        const nextUrl = this.evaluateRuleString(
          content,
          ruleContent.nextContentUrl,
          context
        );
        if (nextUrl) {
          const resolvedNext = resolveUrl(currentUrl, nextUrl);
          if (resolvedNext !== currentUrl) {
            currentUrl = resolvedNext;
            pageCount++;
          } else {
            break;
          }
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return allContent.join("\n");
  }

  async explore(
    exploreUrl: string,
    page: number = 1
  ): Promise<Array<Record<string, string>>> {
    const variables: Record<string, string> = {
      page: String(page),
    };

    const parsed = parseSearchUrl(exploreUrl, variables, this.source.bookSourceUrl);
    const fetchOptions: FetchOptions = {
      method: parsed.method,
      headers: { ...this.getHeaders(), ...parsed.headers },
      body: parsed.body,
      charset: parsed.charset,
    };

    const result = await fetchContent(parsed.url, fetchOptions);
    const ruleExplore = this.source.ruleExplore;
    if (!ruleExplore || !ruleExplore.bookList) return [];

    const context: RuleContext = {
      baseUrl: this.source.bookSourceUrl,
      variableMap: this.variableMap,
    };

    const bookList = this.extractList(
      result.isJson ? result.jsonData : result.content,
      ruleExplore.bookList,
      context
    );

    return bookList.map((item) =>
      this.extractBookFields(item, ruleExplore, context)
    );
  }

  getExploreCategories(): Array<{ title: string; url: string }> {
    return parseExploreUrl(this.source.exploreUrl || "");
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.source.header) {
      try {
        const parsed = JSON.parse(this.source.header);
        Object.assign(headers, parsed);
      } catch {
        // not valid JSON header
      }
    }
    return headers;
  }

  private extractList(
    content: unknown,
    listRule: string,
    context: RuleContext
  ): unknown[] {
    const processed = processPutAndGet(listRule, context.variableMap);
    const parsed = parseRule(processed);

    if (parsed.chains.length > 0) {
      return this.executeChainList(content, parsed.chains, context);
    }

    return this.executeListRule(content, parsed);
  }

  private executeListRule(
    content: unknown,
    rule: ParsedRule
  ): unknown[] {
    switch (rule.type) {
      case "css": {
        const html = typeof content === "string" ? content : String(content);
        return extractListByCss(html, rule.expression);
      }
      case "json": {
        return queryByJsonPath(content, rule.expression);
      }
      default:
        return [];
    }
  }

  private executeChainList(
    content: unknown,
    chains: ParsedRule[],
    context: RuleContext
  ): unknown[] {
    let current: unknown = content;

    for (let i = 0; i < chains.length; i++) {
      const chain = chains[i];
      if (i === 0) {
        current = this.executeListRule(current, chain);
      } else {
        if (Array.isArray(current)) {
          current = current.map((item) =>
            this.evaluateRuleSingle(item, chain, context)
          );
        } else {
          current = this.evaluateRuleSingle(current, chain, context);
        }
      }
    }

    return Array.isArray(current) ? current : [current];
  }

  private evaluateRule(
    content: unknown,
    rule: string,
    context: RuleContext
  ): unknown {
    const processed = processPutAndGet(rule, context.variableMap);
    const parsed = parseRule(processed);

    if (parsed.chains.length > 0) {
      return this.executeChain(content, parsed.chains, context);
    }

    return this.executeSingleRule(content, parsed, context);
  }

  private evaluateRuleString(
    content: unknown,
    rule: string,
    context: RuleContext
  ): string {
    const result = this.evaluateRule(content, rule, context);
    if (result == null) return "";
    if (typeof result === "string") return result.trim();
    if (Array.isArray(result)) {
      return result.map(String).join(",").trim();
    }
    return String(result).trim();
  }

  private evaluateRuleSingle(
    content: unknown,
    rule: ParsedRule,
    context: RuleContext
  ): unknown {
    switch (rule.type) {
      case "css": {
        const html = typeof content === "string"
          ? content
          : content instanceof Object && "type" in (content as Record<string, unknown>)
            ? (() => {
                const $ = cheerio.load("");
                return getElementHtml($, content as Parameters<typeof getElementHtml>[1]);
              })()
            : String(content);
        const results = extractByCss(html, rule.expression);
        return Array.isArray(results) ? results[0] ?? "" : results;
      }
      case "json": {
        return queryByJsonPathString(content, rule.expression);
      }
      case "regex": {
        const text = typeof content === "string" ? content : String(content);
        try {
          const match = new RegExp(rule.expression).exec(text);
          return match ? (match[1] || match[0]) : "";
        } catch {
          return "";
        }
      }
      case "js": {
        return this.evalSimpleJs(rule.expression, content, context);
      }
      default:
        return "";
    }
  }

  private executeSingleRule(
    content: unknown,
    rule: ParsedRule,
    context: RuleContext
  ): unknown {
    return this.evaluateRuleSingle(content, rule, context);
  }

  private executeChain(
    content: unknown,
    chains: ParsedRule[],
    context: RuleContext
  ): unknown {
    let current = content;
    for (const chain of chains) {
      current = this.executeSingleRule(current, chain, context);
    }
    return current;
  }

  private extractBookFields(
    item: unknown,
    rules: SearchRule,
    context: RuleContext
  ): Record<string, string> {
    const fields: Record<string, string> = {};
    const ruleMap: Record<string, string | undefined> = {
      name: rules.name,
      author: rules.author,
      intro: rules.intro,
      kind: rules.kind,
      lastChapter: rules.lastChapter,
      updateTime: rules.updateTime,
      bookUrl: rules.bookUrl,
      coverUrl: rules.coverUrl,
      wordCount: rules.wordCount,
    };

    for (const [key, rule] of Object.entries(ruleMap)) {
      if (rule) {
        const value = this.evaluateRuleString(item, rule, context);
        if (value) {
          if (key === "bookUrl" || key === "coverUrl") {
            fields[key] = resolveUrl(context.baseUrl, value);
          } else {
            fields[key] = value;
          }
        }
      }
    }

    fields.origin = this.source.bookSourceUrl;
    fields.originName = this.source.bookSourceName;
    return fields;
  }

  /**
   * Evaluate JavaScript expression in a sandboxed VM.
   * Used for @js: prefixed rules in searchUrl, exploreUrl, and content rules.
   */
  private evalJs(
    expression: string,
    extraVars: Record<string, string> = {}
  ): string {
    try {
      const javaObj = {
        ajax: () => "",
        get: (key: string) => this.variableMap[key] ?? "",
        put: (key: string, value: string) => {
          this.variableMap[key] = value;
          return value;
        },
        log: (msg: string) => console.log("[js]", msg),
      };

      const sandbox: Record<string, unknown> = {
        ...extraVars,
        java: javaObj,
        encodeURI,
        encodeURIComponent,
        decodeURI,
        decodeURIComponent,
        JSON,
        Math,
        parseInt,
        parseFloat,
        String,
        Number,
        Boolean,
        Array,
        Object,
        RegExp,
      };

      // If expression contains "result", set it from content context
      if (expression.includes("result") && extraVars.result) {
        sandbox.result = extraVars.result;
      }

      const script = new vm.Script(`"use strict"; (${expression});`);
      const vmContext = vm.createContext(sandbox);
      const value = script.runInContext(vmContext, { timeout: 3000 });
      return String(value ?? "");
    } catch (e) {
      console.error("evalJs error:", e instanceof Error ? e.message : String(e));
      return "";
    }
  }

  /**
   * Legacy method for rule evaluation — delegates to evalJs.
   */
  private evalSimpleJs(
    expression: string,
    content: unknown,
    context: RuleContext
  ): string {
    const text = typeof content === "string" ? content : JSON.stringify(content);
    return this.evalJs(expression, {
      result: text,
      baseUrl: context.baseUrl,
    });
  }
}

export async function createSourceExecutor(
  source: BookSource
): Promise<SourceExecutor> {
  return new SourceExecutor(source);
}

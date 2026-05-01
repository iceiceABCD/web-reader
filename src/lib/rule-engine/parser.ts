export interface RuleContext {
  baseUrl: string;
  variableMap: Record<string, string>;
  [key: string]: unknown;
}

export type RuleType = "css" | "json" | "js" | "regex";

export interface ParsedRule {
  type: RuleType;
  expression: string;
  chains: ParsedRule[];
}

const CSS_PREFIX = "@css:";
const JSON_PREFIX = "@json:";
const JS_PREFIX = "@js:";
const REGEX_PREFIX = "@regex:";
const XPATH_PREFIX = "@xpath:";

export function detectRuleType(rule: string): RuleType {
  if (rule.startsWith(CSS_PREFIX) || rule.startsWith("//") || rule.startsWith("/")) {
    if (rule.startsWith(XPATH_PREFIX)) return "css";
    return "css";
  }
  if (rule.startsWith(JSON_PREFIX) || rule.startsWith("$.")) {
    return "json";
  }
  if (rule.startsWith(JS_PREFIX) || rule.startsWith("<js>")) {
    return "js";
  }
  if (rule.startsWith(REGEX_PREFIX)) {
    return "regex";
  }
  return "css";
}

export function parseRule(rule: string): ParsedRule {
  const chains = splitChains(rule);
  if (chains.length <= 1) {
    return parseSingleRule(rule.trim());
  }
  return {
    type: "css",
    expression: "",
    chains: chains.map((c) => parseSingleRule(c.trim())),
  };
}

function parseSingleRule(rule: string): ParsedRule {
  let type: RuleType = "css";
  let expression = rule;

  if (rule.startsWith(CSS_PREFIX)) {
    type = "css";
    expression = rule.substring(CSS_PREFIX.length);
  } else if (rule.startsWith(JSON_PREFIX)) {
    type = "json";
    expression = rule.substring(JSON_PREFIX.length);
  } else if (rule.startsWith(JS_PREFIX)) {
    type = "js";
    expression = rule.substring(JS_PREFIX.length);
  } else if (rule.startsWith("<js>")) {
    type = "js";
    const endTag = "</js>";
    const endIdx = rule.lastIndexOf(endTag);
    expression =
      endIdx > 0 ? rule.substring(4, endIdx) : rule.substring(4);
  } else if (rule.startsWith(REGEX_PREFIX)) {
    type = "regex";
    expression = rule.substring(REGEX_PREFIX.length);
  } else if (rule.startsWith(XPATH_PREFIX)) {
    type = "css";
    expression = rule.substring(XPATH_PREFIX.length);
  } else if (rule.startsWith("$.") || rule.startsWith("$[")) {
    type = "json";
    expression = rule;
  }

  return { type, expression, chains: [] };
}

function splitChains(rule: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  let i = 0;
  while (i < rule.length) {
    if (rule[i] === "{" && rule[i + 1] === "{") {
      depth++;
      current += "{{";
      i += 2;
      continue;
    }
    if (rule[i] === "}" && rule[i + 1] === "}" && depth > 0) {
      depth--;
      current += "}}";
      i += 2;
      continue;
    }
    if (
      rule[i] === "#" &&
      rule[i + 1] === "#" &&
      depth === 0 &&
      !isInsideJsOrRegex(rule, i)
    ) {
      parts.push(current);
      current = "";
      i += 2;
      continue;
    }
    current += rule[i];
    i++;
  }
  if (current) {
    parts.push(current);
  }
  return parts;
}

function isInsideJsOrRegex(rule: string, pos: number): boolean {
  const before = rule.substring(0, pos);
  return (
    before.lastIndexOf("<js>") > before.lastIndexOf("</js>") ||
    before.lastIndexOf("@js:") > before.lastIndexOf("@js:", pos - 4)
  );
}

export function processTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] ?? "";
  });
}

export function processPutAndGet(
  rule: string,
  variableMap: Record<string, string>
): string {
  let result = rule;

  const putMatch = result.match(/@put:\{([^:]+):([^}]*)\}/);
  if (putMatch) {
    variableMap[putMatch[1]] = putMatch[2];
    result = result.replace(/@put:\{[^}]+\}/, "");
  }

  result = result.replace(/@get:\{([^}]+)\}/g, (_, key) => {
    return variableMap[key] ?? "";
  });

  return result;
}

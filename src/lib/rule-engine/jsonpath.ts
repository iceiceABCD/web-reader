import { JSONPath } from "jsonpath-plus";

export function queryByJsonPath(data: unknown, path: string): unknown[] {
  try {
    const result = JSONPath({
      path,
      json: data as object,
      wrap: true,
    });
    return result as unknown[];
  } catch {
    return [];
  }
}

export function queryByJsonPathFirst(
  data: unknown,
  path: string
): unknown {
  const results = queryByJsonPath(data, path);
  return results[0] ?? null;
}

export function queryByJsonPathString(
  data: unknown,
  path: string
): string {
  const result = queryByJsonPathFirst(data, path);
  if (result == null) return "";
  if (typeof result === "string") return result;
  return String(result);
}

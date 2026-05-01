import type { BookSource } from "@/lib/types";

export function dbToSource(dbRow: Record<string, unknown>): BookSource {
  const source: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(dbRow)) {
    source[key] = value === null ? undefined : value;
  }
  return source as unknown as BookSource;
}

export interface ReplaceRule {
  id?: number;
  name: string;
  group?: string;
  pattern: string;
  replacement: string;
  isRegex: boolean;
  scope?: string;
  enabled: boolean;
  sortOrder: number;
}

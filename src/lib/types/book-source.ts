import type {
  SearchRule,
  BookInfoRule,
  TocRule,
  ContentRule,
  ExploreRule,
  ReviewRule,
} from "./rule";

export interface BookSource {
  bookSourceUrl: string;
  bookSourceName: string;
  bookSourceGroup?: string;
  bookSourceType: number;
  bookUrlPattern?: string;
  customOrder: number;
  enabled: boolean;
  enabledExplore: boolean;
  enabledCookieJar?: boolean;
  concurrentRate?: string;
  header?: string;
  loginUrl?: string;
  loginUi?: string;
  loginCheckJs?: string;
  bookSourceComment?: string;
  variableComment?: string;
  lastUpdateTime: number;
  respondTime: number;
  weight: number;
  exploreUrl?: string;
  searchUrl?: string;
  ruleSearch?: SearchRule;
  ruleExplore?: ExploreRule;
  ruleBookInfo?: BookInfoRule;
  ruleToc?: TocRule;
  ruleContent?: ContentRule;
  ruleReview?: ReviewRule;
}

export function defaultBookSource(): BookSource {
  return {
    bookSourceUrl: "",
    bookSourceName: "",
    bookSourceType: 0,
    customOrder: 0,
    enabled: true,
    enabledExplore: true,
    lastUpdateTime: 0,
    respondTime: 180000,
    weight: 0,
  };
}

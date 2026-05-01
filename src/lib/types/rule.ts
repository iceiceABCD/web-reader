export interface SearchRule {
  checkKeyWord?: string;
  bookList?: string;
  name?: string;
  author?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  updateTime?: string;
  bookUrl?: string;
  coverUrl?: string;
  wordCount?: string;
}

export interface BookInfoRule {
  init?: string;
  name?: string;
  author?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  updateTime?: string;
  coverUrl?: string;
  tocUrl?: string;
  wordCount?: string;
  canReName?: string;
  downloadUrls?: string;
}

export interface TocRule {
  preUpdateJs?: string;
  chapterList?: string;
  chapterName?: string;
  chapterUrl?: string;
  formatJs?: string;
  isVolume?: string;
  isVip?: string;
  isPay?: string;
  updateTime?: string;
  nextTocUrl?: string;
}

export interface ContentRule {
  content?: string;
  subContent?: string;
  title?: string;
  nextContentUrl?: string;
  webJs?: string;
  sourceRegex?: string;
  replaceRegex?: string;
  imageStyle?: string;
  imageDecode?: string;
  payAction?: string;
  callBackJs?: string;
}

export interface ExploreRule {
  bookList?: string;
  name?: string;
  author?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  updateTime?: string;
  bookUrl?: string;
  coverUrl?: string;
  wordCount?: string;
}

export interface ReviewRule {
  reviewUrl?: string;
  avatarRule?: string;
  contentRule?: string;
  postUrl?: string;
}

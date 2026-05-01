export interface SearchBookResult {
  name: string;
  author: string;
  kind?: string;
  bookUrl: string;
  coverUrl?: string;
  intro?: string;
  origin: string;
  originName: string;
  type: number;
  wordCount?: string;
  latestChapterTitle?: string;
  latestChapter?: string;
  tocUrl?: string;
}

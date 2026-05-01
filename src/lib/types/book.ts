export interface Book {
  bookUrl: string;
  tocUrl: string;
  origin: string;
  originName: string;
  name: string;
  author: string;
  kind?: string;
  coverUrl?: string;
  intro?: string;
  type: number;
  latestChapterTitle?: string;
  totalChapterNum: number;
  durChapterIndex: number;
  durChapterPos: number;
  durChapterTime: number;
  wordCount?: string;
  canUpdate: boolean;
  order: number;
  variable?: string;
}

export function defaultBook(): Book {
  return {
    bookUrl: "",
    tocUrl: "",
    origin: "",
    originName: "",
    name: "",
    author: "",
    type: 0,
    totalChapterNum: 0,
    durChapterIndex: 0,
    durChapterPos: 0,
    durChapterTime: Date.now(),
    canUpdate: true,
    order: 0,
  };
}

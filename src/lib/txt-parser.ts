import iconv from "iconv-lite";

interface ParsedChapter {
  title: string;
  content: string;
}

interface ParsedTxtBook {
  name: string;
  author: string;
  intro: string;
  coverUrl: string;
  chapters: ParsedChapter[];
}

const CHAPTER_PATTERN =
  /^(第[零一二三四五六七八九十百千万\d]+[章节回卷集部篇]|Chapter\s*\d+|序[章篇]|楔子|尾声|番外)/m;

export function parseTxtFile(buffer: Buffer, fileName: string): ParsedTxtBook {
  const text = decodeBuffer(buffer);
  const chapters = splitChapters(text, fileName);

  return {
    name: extractName(fileName),
    author: "",
    intro: "",
    coverUrl: "",
    chapters,
  };
}

function decodeBuffer(buffer: Buffer): string {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return iconv.decode(buffer, "utf-8");
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return iconv.decode(buffer, "utf-16le");
  }

  const utf8Text = iconv.decode(buffer, "utf-8");
  if (!utf8Text.includes("�")) return utf8Text;

  return iconv.decode(buffer, "gbk");
}

function splitChapters(text: string, fallbackTitle: string): ParsedChapter[] {
  const lines = text.split(/\r?\n/);
  const chapters: ParsedChapter[] = [];
  let currentTitle = fallbackTitle;
  let currentLines: string[] = [];

  for (const line of lines) {
    if (CHAPTER_PATTERN.test(line.trim())) {
      if (currentLines.length > 0 || chapters.length > 0) {
        chapters.push({
          title: currentTitle,
          content: currentLines.join("\n").trim(),
        });
      }
      currentTitle = line.trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    chapters.push({
      title: currentTitle,
      content: currentLines.join("\n").trim(),
    });
  }

  if (chapters.length === 0) {
    chapters.push({
      title: fallbackTitle,
      content: text.trim(),
    });
  }

  return chapters.map((ch) => ({
    ...ch,
    content: ch.content.replace(/\n{3,}/g, "\n\n"),
  }));
}

function extractName(fileName: string): string {
  return fileName.replace(/\.(txt|epub)$/i, "").trim();
}
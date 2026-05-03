import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { EPub } from "epub2";
import * as cheerio from "cheerio";

interface ParsedChapter {
  title: string;
  content: string;
}

interface ParsedEpubBook {
  name: string;
  author: string;
  intro: string;
  coverUrl: string;
  chapters: ParsedChapter[];
}

export async function parseEpubFile(buffer: Buffer, fileName: string): Promise<ParsedEpubBook> {
  const tmpDir = os.tmpdir();
  const tmpPath = path.join(tmpDir, `reader-${Date.now()}-${Math.random().toString(36).slice(2)}.epub`);
  try {
    fs.writeFileSync(tmpPath, buffer);
    const epub = await EPub.createAsync(tmpPath);

    const name = epub.metadata.title || extractName(fileName);
    const author = epub.metadata.creator || "";
    const intro = epub.metadata.description || "";

    let coverUrl = "";
    if (epub.metadata.cover) {
      try {
        const [coverBuf, mimeType] = await epub.getImageAsync(epub.metadata.cover as string);
        const base64 = coverBuf.toString("base64");
        coverUrl = `data:${mimeType};base64,${base64}`;
      } catch {
        // no cover available
      }
    }

    const chapters: ParsedChapter[] = [];
    const flow = epub.flow || [];

    for (const item of flow) {
      if (!item.id) continue;
      try {
        const html = await epub.getChapterAsync(item.id);
        const text = htmlToText(html);
        if (text.trim()) {
          chapters.push({
            title: item.title || `Chapter ${chapters.length + 1}`,
            content: text.trim(),
          });
        }
      } catch {
        // skip unreadable chapters
      }
    }

    if (chapters.length === 0) {
      chapters.push({
        title: name,
        content: intro || "此书内容无法解析",
      });
    }

    return { name, author, intro, coverUrl, chapters };
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* cleanup */ }
  }
}

function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $("head, script, style").remove();
  $("img").remove();
  $("br").replaceWith("\n");
  $("p, div, h1, h2, h3, h4, h5, h6, li, tr").each(function () {
    $(this).append("\n");
  });
  const text = $.text();
  return text.replace(/\n{3,}/g, "\n\n");
}

function extractName(fileName: string): string {
  return fileName.replace(/\.(txt|epub)$/i, "").trim();
}
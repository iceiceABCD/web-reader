import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { books, chapters, chapterContent } from "@/lib/db/schema";
import { getUserId, unauthorized } from "@/lib/auth-helpers";
import { v4 as uuidv4 } from "uuid";
import { parseTxtFile } from "@/lib/txt-parser";
import { parseEpubFile } from "@/lib/epub-parser";

const MAX_EPUB_SIZE = 10 * 1024 * 1024;
const MAX_TXT_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isTxt = fileName.endsWith(".txt");
    const isEpub = fileName.endsWith(".epub");

    if (!isTxt && !isEpub) {
      return NextResponse.json({ error: "仅支持 TXT 和 EPUB 格式" }, { status: 400 });
    }

    const maxSize = isEpub ? MAX_EPUB_SIZE : MAX_TXT_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `文件过大，${isEpub ? "EPUB" : "TXT"} 最大 ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bookUuid = uuidv4();
    const bookUrl = `local://${bookUuid}`;

    let parsed;
    if (isEpub) {
      parsed = await parseEpubFile(buffer, file.name);
    } else {
      parsed = parseTxtFile(buffer, file.name);
    }

    if (parsed.chapters.length === 0) {
      return NextResponse.json({ error: "无法解析书籍内容" }, { status: 400 });
    }

    const db = getDb();

    await db.transaction(async (tx) => {
      await tx.insert(books).values({
        bookUrl,
        userId,
        tocUrl: bookUrl,
        origin: "local",
        originName: "本地导入",
        name: parsed.name,
        author: parsed.author,
        intro: parsed.intro || null,
        coverUrl: parsed.coverUrl || null,
        type: isEpub ? 1 : 0,
        totalChapterNum: parsed.chapters.length,
        canUpdate: false,
        durChapterIndex: 0,
        durChapterPos: 0,
        durChapterTime: Date.now(),
      });

      const chapterValues = parsed.chapters.map((ch, i) => ({
        url: `local://${bookUuid}/${i}`,
        bookUrl,
        userId,
        title: ch.title,
        index: i,
        isVolume: false,
        isVip: false,
        isPay: false,
      }));
      await tx.insert(chapters).values(chapterValues).onConflictDoNothing();

      const contentValues = parsed.chapters.map((ch, i) => ({
        bookUrl,
        userId,
        chapterIndex: i,
        content: ch.content,
      }));
      await tx.insert(chapterContent).values(contentValues).onConflictDoNothing();
    });

    return NextResponse.json({
      bookUrl,
      name: parsed.name,
      author: parsed.author,
      totalChapterNum: parsed.chapters.length,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: "上传解析失败" },
      { status: 500 }
    );
  }
}
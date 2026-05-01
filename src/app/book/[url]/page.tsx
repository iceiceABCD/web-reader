"use client";

import { useState, useCallback, Suspense } from "react";
import type { Book, BookChapter } from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function BookDetailContent() {
  const searchParams = useSearchParams();
  const bookUrl = typeof window !== "undefined" ? window.location.pathname.replace("/book/", "") : "";
  const origin = searchParams.get("origin") || "";

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [inBookshelf, setInBookshelf] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const decodedUrl = decodeURIComponent(bookUrl);

  const fetchBookInfo = useCallback(async () => {
    try {
      let bookData: Book | null = null;

      const bookRes = await fetch(`/api/books/${encodeURIComponent(decodedUrl)}`);
      if (bookRes.ok) {
        bookData = await bookRes.json();
        setBook(bookData);
        setInBookshelf(true);
      }

      if (!bookData && origin) {
        const sourceRes = await fetch(`/api/bookSources/${encodeURIComponent(origin)}`);
        if (sourceRes.ok) {
          const sourceData = await sourceRes.json();

          const { createSourceExecutor } = await import("@/lib/rule-engine");
          const executor = await createSourceExecutor(sourceData);
          const info = await executor.getBookInfo(decodedUrl);

          if (info) {
            bookData = {
              bookUrl: decodedUrl,
              tocUrl: info.tocUrl || decodedUrl,
              origin,
              originName: sourceData.bookSourceName,
              name: info.name || "",
              author: info.author || "",
              kind: info.kind,
              coverUrl: info.coverUrl,
              intro: info.intro,
              type: 0,
              totalChapterNum: 0,
              durChapterIndex: 0,
              durChapterPos: 0,
              durChapterTime: Date.now(),
              canUpdate: true,
              order: 0,
            };
            setBook(bookData);
          }
        }
      } else if (bookData?.origin) {
        // source info already embedded in bookData
      }
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [decodedUrl, origin]);

  if (!loaded) {
    fetchBookInfo();
  }

  const fetchChapters = async () => {
    if (!book) return;
    setChaptersLoading(true);
    try {
      const res = await fetch(
        `/api/books/${encodeURIComponent(book.bookUrl)}/chapters`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setChapters(data);
      }
    } finally {
      setChaptersLoading(false);
    }
  };

  const addToBookshelf = async () => {
    if (!book) return;
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(book),
    });
    if (res.ok) {
      setInBookshelf(true);
      alert(`《${book.name}》已加入书架`);
    }
  };

  const removeFromBookshelf = async () => {
    if (!book || !confirm(`确定将《${book.name}》移出书架？`)) return;
    await fetch(`/api/books/${encodeURIComponent(book.bookUrl)}`, {
      method: "DELETE",
    });
    setInBookshelf(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!book) {
    return <div className="text-center py-10">书籍信息获取失败</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex gap-6 mb-8">
        <div className="w-32 h-44 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary p-3">
              <span className="text-sm text-center">{book.name}</span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">{book.name}</h1>
          <p className="text-muted-foreground mb-1">{book.author}</p>
          {book.kind && (
            <p className="text-sm text-muted-foreground mb-1">{book.kind}</p>
          )}
          {book.wordCount && (
            <p className="text-sm text-muted-foreground mb-1">
              字数: {book.wordCount}
            </p>
          )}
          {book.latestChapterTitle && (
            <p className="text-sm text-muted-foreground mb-1">
              最新: {book.latestChapterTitle}
            </p>
          )}
          {book.originName && (
            <p className="text-sm text-muted-foreground mb-3">
              来源: {book.originName}
            </p>
          )}
          <div className="flex gap-2">
            {inBookshelf ? (
              <>
                <Link
                  href={`/read/${encodeURIComponent(book.bookUrl)}`}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                >
                  开始阅读
                </Link>
                <button
                  onClick={removeFromBookshelf}
                  className="px-4 py-2 rounded-md border text-sm hover:bg-accent"
                >
                  移出书架
                </button>
              </>
            ) : (
              <button
                onClick={addToBookshelf}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              >
                加入书架
              </button>
            )}
          </div>
        </div>
      </div>

      {book.intro && (
        <div className="mb-8">
          <h2 className="font-semibold mb-2">简介</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {book.intro}
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">目录</h2>
          <button
            onClick={fetchChapters}
            disabled={chaptersLoading}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {chaptersLoading ? "加载中..." : chapters.length > 0 ? "刷新目录" : "加载目录"}
          </button>
        </div>
        {chapters.length > 0 ? (
          <div className="space-y-0.5 max-h-[600px] overflow-y-auto border rounded-lg p-2">
            {chapters.map((ch) => (
              <Link
                key={`${ch.url}-${ch.index}`}
                href={`/read/${encodeURIComponent(book.bookUrl)}?index=${ch.index}`}
                className="block px-3 py-1.5 text-sm rounded hover:bg-accent truncate"
              >
                {ch.isVolume ? (
                  <span className="font-semibold text-muted-foreground">{ch.title}</span>
                ) : (
                  ch.title
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">点击&ldquo;加载目录&rdquo;获取章节列表</p>
        )}
      </div>
    </div>
  );
}

export default function BookDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <BookDetailContent />
    </Suspense>
  );
}

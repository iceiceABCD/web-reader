"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Book, BookChapter } from "@/lib/types";
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
  const [showAllChapters, setShowAllChapters] = useState(false);

  const decodedUrl = decodeURIComponent(bookUrl);

  useEffect(() => {
    fetch(`/api/books/${encodeURIComponent(decodedUrl)}`)
      .then((bookRes) => {
        if (bookRes.ok) return bookRes.json();
        return null;
      })
      .then((data) => {
        if (data && typeof data === "object" && data.bookUrl) {
          setBook(data);
          setInBookshelf(true);
          setLoading(false);
          return;
        }
        if (!origin) {
          setLoading(false);
          return;
        }
        return fetch(`/api/bookSources/${encodeURIComponent(origin)}`)
          .then((sourceRes) => sourceRes.json())
          .then(async (sourceData) => {
            const { createSourceExecutor } = await import("@/lib/rule-engine");
            const executor = await createSourceExecutor(sourceData);
            const info = await executor.getBookInfo(decodedUrl);
            if (info) {
              const bookData: Book = {
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
          });
      })
      .catch((error) => {
        console.error("Failed to fetch book info:", error);
      })
      .finally(() => setLoading(false));
  }, [decodedUrl, origin]);

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
    } catch (error) {
      console.error("Failed to fetch chapters:", error);
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
      <div className="flex items-center justify-center py-32">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full"
        />
      </div>
    );
  }

  if (!book) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-20"
      >
        <div className="text-5xl mb-4 opacity-30">😕</div>
        <p className="text-muted-foreground">书籍信息获取失败</p>
      </motion.div>
    );
  }

  const displayedChapters = showAllChapters ? chapters : chapters.slice(0, 50);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Book Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-6 mb-10"
      >
        {/* Cover */}
        <div className="w-36 h-48 flex-shrink-0 rounded-xl overflow-hidden bg-muted shadow-lg">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-accent p-4">
              <span className="text-4xl mb-2 opacity-40">📖</span>
              <span className="text-sm text-center font-serif">{book.name}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-3">
            {book.name}
          </h1>
          <p className="text-lg text-muted-foreground mb-4">{book.author}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {book.kind?.split(",").map((k) => (
              <span
                key={k}
                className="px-2.5 py-1 rounded-full text-xs bg-secondary text-secondary-foreground"
              >
                {k.trim()}
              </span>
            ))}
            {book.originName && book.origin !== "local" && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary">
                {book.originName}
              </span>
            )}
          </div>

          {book.wordCount && (
            <p className="text-sm text-muted-foreground mb-2">
              字数：{(Number(book.wordCount) / 10000).toFixed(1)} 万
            </p>
          )}

          {book.latestChapterTitle && (
            <p className="text-sm text-muted-foreground mb-4">
              最新：{book.latestChapterTitle}
            </p>
          )}

          <div className="flex gap-3 mt-6">
            {inBookshelf ? (
              <>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href={`/read/${encodeURIComponent(book.bookUrl)}`}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <span>▶</span>
                    开始阅读
                  </Link>
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={removeFromBookshelf}
                  className="px-6 py-2.5 rounded-xl border text-sm font-medium hover:bg-accent/50 transition-colors"
                >
                  移出书架
                </motion.button>
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={addToBookshelf}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <span>+</span>
                加入书架
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Intro */}
      {book.intro && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <h2 className="text-lg font-serif font-semibold mb-3">简介</h2>
          <div className="p-5 rounded-xl bg-secondary/30 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {book.intro}
          </div>
        </motion.div>
      )}

      {/* Chapters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif font-semibold">
            目录
            {chapters.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                共 {chapters.length} 章
              </span>
            )}
          </h2>
          {book.origin !== "local" && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={fetchChapters}
              disabled={chaptersLoading}
              className="text-sm text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
            >
              {chaptersLoading ? "加载中..." : chapters.length > 0 ? "刷新目录" : "加载目录"}
            </motion.button>
          )}
        </div>

        <AnimatePresence>
          {chapters.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border rounded-xl overflow-hidden"
            >
              <div className="max-h-[500px] overflow-y-auto">
                {displayedChapters.map((ch, index) => (
                  <Link
                    key={`${ch.url}-${ch.index}`}
                    href={`/read/${encodeURIComponent(book.bookUrl)}?index=${ch.index}`}
                    className={`
                      block px-4 py-3 text-sm transition-colors border-b last:border-b-0
                      ${ch.isVolume
                        ? "font-semibold text-muted-foreground bg-secondary/30"
                        : "text-foreground hover:bg-accent/30"
                      }
                      ${index % 2 === 0 ? "bg-card" : "bg-secondary/10"}
                    `}
                  >
                    <span className="truncate block">{ch.title}</span>
                  </Link>
                ))}
              </div>
              {chapters.length > 50 && !showAllChapters && (
                <button
                  onClick={() => setShowAllChapters(true)}
                  className="w-full py-3 text-sm text-primary hover:bg-accent/30 transition-colors border-t"
                >
                  显示全部 {chapters.length} 章
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 rounded-xl border border-dashed"
            >
              <p className="text-sm text-muted-foreground">
                {book.origin === "local"
                  ? "暂无章节信息"
                  : "点击「加载目录」获取章节列表"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function BookDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-32">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full"
        />
      </div>
    }>
      <BookDetailContent />
    </Suspense>
  );
}

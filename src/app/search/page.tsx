"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import type { SearchBookResult as SearchResultType, BookSource } from "@/lib/types";
import Link from "next/link";

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<SearchResultType[]>([]);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<BookSource[]>([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("searchHistory") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    fetch("/api/bookSources")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSources(data.filter((s: BookSource) => s.searchUrl));
        }
      })
      .catch(() => {});
  }, []);

  const doSearch = useCallback(
    async (key: string) => {
      if (!key.trim()) return;
      setLoading(true);
      setResults([]);
      try {
        const params = new URLSearchParams({ key: key.trim() });
        if (selectedSource) params.set("source", selectedSource);
        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setResults(data);
        }
        const newHistory = [key, ...searchHistory.filter((h) => h !== key)].slice(0, 20);
        setSearchHistory(newHistory);
        localStorage.setItem("searchHistory", JSON.stringify(newHistory));
      } catch {
        // search error
      } finally {
        setLoading(false);
      }
    },
    [searchHistory]
  );

  const addToBookshelf = async (book: SearchResultType) => {
    await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookUrl: book.bookUrl,
        tocUrl: book.tocUrl || book.bookUrl,
        origin: book.origin,
        originName: book.originName,
        name: book.name,
        author: book.author,
        kind: book.kind,
        coverUrl: book.coverUrl,
        intro: book.intro,
        type: book.type,
        wordCount: book.wordCount,
        latestChapterTitle: book.latestChapterTitle,
      }),
    });
    alert(`《${book.name}》已加入书架`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-serif font-semibold mb-6">搜索</h1>
        <div className="flex gap-2">
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="h-10 rounded-xl border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring max-w-[140px]"
          >
            <option value="">全部书源</option>
            {sources.map((s) => (
              <option key={s.bookSourceUrl} value={s.bookSourceUrl}>
                {s.bookSourceName}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch(keyword)}
            placeholder="输入书名或作者名..."
            className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => doSearch(keyword)}
            disabled={loading}
            className="h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 shadow-sm"
          >
            {loading ? "搜索中..." : "搜索"}
          </motion.button>
        </div>
      </motion.div>

      {searchHistory.length > 0 && !loading && results.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">搜索历史</span>
            <button
              onClick={() => {
                setSearchHistory([]);
                localStorage.removeItem("searchHistory");
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              清空
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((h) => (
              <button
                key={h}
                onClick={() => {
                  setKeyword(h);
                  doSearch(h);
                }}
                className="px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-accent"
              >
                {h}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full"
          />
        </div>
      )}

      {!loading && results.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {results.map((book, idx) => (
            <div
              key={`${book.bookUrl}-${idx}`}
              className="flex gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary">
                    <span className="text-[10px] text-center p-1">{book.name}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium line-clamp-1">
                      <Link
                        href={`/book/${encodeURIComponent(book.bookUrl)}?origin=${encodeURIComponent(book.origin)}`}
                        className="hover:text-primary"
                      >
                        {book.name}
                      </Link>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {book.author} {book.kind && `· ${book.kind}`}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addToBookshelf(book)}
                    className="flex-shrink-0 px-3 py-1 rounded-xl text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  >
                    加入书架
                  </motion.button>
                </div>
                {book.intro && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{book.intro}</p>
                )}
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {book.latestChapter && <span>最新: {book.latestChapter}</span>}
                  <span className="px-1.5 py-0.5 rounded-xl bg-secondary text-[10px]">
                    {book.originName}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {!loading && results.length === 0 && keyword && searchHistory.length === 0 && (
        <p className="text-center text-muted-foreground py-10">输入关键词开始搜索</p>
      )}
    </div>
  );
}
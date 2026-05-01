"use client";

import { useState, useCallback } from "react";
import type { SearchBookResult as SearchResultType } from "@/lib/types";
import Link from "next/link";

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<SearchResultType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("searchHistory") || "[]");
    } catch {
      return [];
    }
  });

  const doSearch = useCallback(
    async (key: string) => {
      if (!key.trim()) return;
      setLoading(true);
      setResults([]);
      try {
        const res = await fetch(`/api/search?key=${encodeURIComponent(key.trim())}`);
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
      <h1 className="text-2xl font-bold mb-6">搜索</h1>
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch(keyword)}
          placeholder="输入书名或作者名..."
          className="flex-1 h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => doSearch(keyword)}
          disabled={loading}
          className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "搜索中..." : "搜索"}
        </button>
      </div>

      {searchHistory.length > 0 && !loading && results.length === 0 && (
        <div className="mb-6">
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
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((book, idx) => (
            <div
              key={`${book.bookUrl}-${idx}`}
              className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="w-16 h-20 flex-shrink-0 rounded overflow-hidden bg-muted">
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
                  <button
                    onClick={() => addToBookshelf(book)}
                    className="flex-shrink-0 px-3 py-1 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    加入书架
                  </button>
                </div>
                {book.intro && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{book.intro}</p>
                )}
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {book.latestChapter && <span>最新: {book.latestChapter}</span>}
                  <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px]">
                    {book.originName}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && keyword && searchHistory.length === 0 && (
        <p className="text-center text-muted-foreground py-10">输入关键词开始搜索</p>
      )}
    </div>
  );
}

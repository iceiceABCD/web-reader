"use client";

import { useState, useCallback } from "react";
import type { SearchBookResult } from "@/lib/types";

interface ExploreCategory {
  sourceUrl: string;
  sourceName: string;
  categories: Array<{ title: string; url: string }>;
}

export default function ExplorePage() {
  const [categories, setCategories] = useState<ExploreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSource, setActiveSource] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [books, setBooks] = useState<SearchBookResult[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);

  const fetchExploreBooks = useCallback(
    async (source: string, category: string) => {
      if (!source || !category) return;
      setBooksLoading(true);
      setBooks([]);
      try {
        const r = await fetch(
          `/api/explore?source=${encodeURIComponent(source)}&url=${encodeURIComponent(category)}`
        );
        const data = await r.json();
        if (Array.isArray(data)) setBooks(data);
      } finally {
        setBooksLoading(false);
      }
    },
    []
  );

  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    fetch("/api/explore")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
          if (data.length > 0 && data[0].categories.length > 0) {
            setActiveSource(data[0].sourceUrl);
            setActiveCategory(data[0].categories[0].url);
            fetchExploreBooks(data[0].sourceUrl, data[0].categories[0].url);
          }
        }
      })
      .finally(() => { setLoading(false); setLoaded(true); });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const currentSource = categories.find((c) => c.sourceUrl === activeSource);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">发现</h1>

      {categories.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <p>暂无发现分类</p>
          <p className="text-sm mt-1">请先导入包含发现规则的书源</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-48 flex-shrink-0">
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.sourceUrl}
                  onClick={() => {
                    setActiveSource(cat.sourceUrl);
                    if (cat.categories.length > 0) {
                      setActiveCategory(cat.categories[0].url);
                      fetchExploreBooks(cat.sourceUrl, cat.categories[0].url);
                    }
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    activeSource === cat.sourceUrl
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-muted-foreground"
                  }`}
                >
                  {cat.sourceName}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            {currentSource && (
              <div className="flex flex-wrap gap-2 mb-4">
                {currentSource.categories.map((cat) => (
                  <button
                    key={cat.url}
                    onClick={() => {
                      setActiveCategory(cat.url);
                      fetchExploreBooks(activeSource, cat.url);
                    }}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      activeCategory === cat.url
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {cat.title}
                  </button>
                ))}
              </div>
            )}

            {booksLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {books.map((book, idx) => (
                  <a
                    key={`${book.bookUrl}-${idx}`}
                    href={`/book/${encodeURIComponent(book.bookUrl)}?origin=${encodeURIComponent(book.origin)}`}
                    className="group flex flex-col gap-2"
                  >
                    <div className="aspect-[3/4] rounded-md overflow-hidden bg-muted">
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-secondary p-2">
                          <span className="text-xs text-center">{book.name}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium line-clamp-1">{book.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

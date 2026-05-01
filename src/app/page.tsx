"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Book } from "@/lib/types";

export default function BookshelfPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setBooks(data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg mb-2">书架空空如也</p>
        <p className="text-sm">去 <Link href="/search" className="text-primary hover:underline">搜索</Link> 或 <Link href="/explore" className="text-primary hover:underline">发现</Link> 添加书籍吧</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的书架</h1>
        <span className="text-sm text-muted-foreground">{books.length} 本</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {books.map((book) => (
          <Link
            key={book.bookUrl}
            href={`/book/${encodeURIComponent(book.bookUrl)}`}
            className="group flex flex-col gap-2"
          >
            <div className="aspect-[3/4] rounded-md overflow-hidden bg-muted relative">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary p-2">
                  <span className="text-xs text-secondary-foreground text-center line-clamp-3">
                    {book.name}
                  </span>
                </div>
              )}
              {book.totalChapterNum > 0 && (
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                  {book.durChapterIndex}/{book.totalChapterNum}
                </div>
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium line-clamp-1">{book.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Book } from "@/lib/types";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

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
      <div className="flex items-center justify-center py-32">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full"
        />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-32 text-center"
      >
        <div className="text-6xl mb-6 opacity-30">📚</div>
        <h2 className="text-xl font-serif font-semibold text-foreground mb-3">
          书架空空如也
        </h2>
        <p className="text-muted-foreground mb-8 max-w-sm">
          开始你的阅读之旅，导入本地书籍或从书源搜索感兴趣的作品
        </p>
        <div className="flex gap-3">
          <Link
            href="/import"
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            导入书籍
          </Link>
          <Link
            href="/search"
            className="px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-accent/50 transition-colors"
          >
            搜索书源
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">我的书架</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {books.length} 本书，继续阅读吧
          </p>
        </div>
        <Link
          href="/import"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-colors"
        >
          <span>+</span>
          添加书籍
        </Link>
      </motion.div>

      {/* Books Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
      >
        {books.map((book, index) => (
          <motion.div key={book.bookUrl} variants={itemVariants}>
            <Link
              href={`/book/${encodeURIComponent(book.bookUrl)}`}
              className="group block"
            >
              {/* Cover */}
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted shadow-sm mb-3 transition-shadow duration-300 group-hover:shadow-lg">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    loading={index < 12 ? "eager" : "lazy"}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-accent p-4">
                    <span className="text-3xl mb-2 opacity-40">📖</span>
                    <span className="text-xs text-center text-muted-foreground line-clamp-3 font-serif">
                      {book.name}
                    </span>
                  </div>
                )}

                {/* Progress Badge */}
                {book.totalChapterNum > 0 && book.durChapterIndex > 0 && (
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
                    {Math.round((book.durChapterIndex / book.totalChapterNum) * 100)}%
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300" />
              </div>

              {/* Info */}
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {book.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {book.author || "未知作者"}
                </p>
                {book.durChapterIndex > 0 && (
                  <p className="text-[10px] text-muted-foreground/70">
                    读到第 {book.durChapterIndex + 1} 章
                  </p>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

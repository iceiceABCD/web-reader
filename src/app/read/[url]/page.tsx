"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Book, BookChapter } from "@/lib/types";

interface ChapterContent {
  title: string;
  content: string;
  index: number;
  isVolume: boolean;
}

function ReaderContent() {
  const searchParams = useSearchParams();
  const bookUrl = typeof window !== "undefined" ? window.location.pathname.replace("/read/", "") : "";
  const decodedUrl = decodeURIComponent(bookUrl);
  const urlIndex = parseInt(searchParams.get("index") || "-1") || -1;

  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [currentContent, setCurrentContent] = useState<ChapterContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window === "undefined") return 18;
    return parseInt(localStorage.getItem("reader-fontSize") || "18");
  });
  const [lineHeight, setLineHeight] = useState(() => {
    if (typeof window === "undefined") return 1.8;
    return parseFloat(localStorage.getItem("reader-lineHeight") || "1.8");
  });
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "default";
    return localStorage.getItem("reader-theme") || "default";
  });
  const [currentIndex, setCurrentIndex] = useState(urlIndex >= 0 ? urlIndex : 0);
  const contentRef = useRef<HTMLDivElement>(null);
  const chaptersRef = useRef<BookChapter[]>([]);
  const currentIndexRef = useRef(urlIndex >= 0 ? urlIndex : 0);

  useEffect(() => {
    chaptersRef.current = chapters;
    currentIndexRef.current = currentIndex;
  });

  const loadContent = (index: number) => {
    const chs = chaptersRef.current;
    if (index < 0 || (chs.length > 0 && index >= chs.length)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/books/${encodeURIComponent(decodedUrl)}/content?index=${index}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch content");
      })
      .then((data) => {
        setCurrentContent(data);
        setCurrentIndex(index);
        currentIndexRef.current = index;
        window.scrollTo(0, 0);
        fetch(`/api/books/${encodeURIComponent(decodedUrl)}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ durChapterIndex: index, durChapterPos: 0 }),
        }).catch(() => {});
      })
      .catch((error) => {
        console.error("Failed to fetch content:", error);
        setLoading(false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        let startIndex = urlIndex >= 0 ? urlIndex : 0;
        if (urlIndex < 0) {
          const bookRes = await fetch(`/api/books/${encodeURIComponent(decodedUrl)}`);
          if (bookRes.ok) {
            const bookData = await bookRes.json();
            if (bookData?.durChapterIndex) {
              startIndex = bookData.durChapterIndex;
            }
          }
        }

        const chRes = await fetch(`/api/books/${encodeURIComponent(decodedUrl)}/chapters`);
        const chData = await chRes.json();
        if (cancelled) return;

        if (Array.isArray(chData)) {
          setChapters(chData);
          chaptersRef.current = chData;
          loadContent(startIndex);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch chapters:", error);
        setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [decodedUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem("reader-fontSize", String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem("reader-lineHeight", String(lineHeight));
  }, [lineHeight]);

  useEffect(() => {
    localStorage.setItem("reader-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const idx = currentIndexRef.current;
      const chs = chaptersRef.current;
      if (e.key === "ArrowLeft" && idx > 0) {
        loadContent(idx - 1);
      } else if (
        e.key === "ArrowRight" &&
        (chs.length === 0 || idx < chs.length - 1)
      ) {
        loadContent(idx + 1);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [decodedUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const themeClass =
    theme === "sepia"
      ? "reader-theme-sepia"
      : theme === "green"
        ? "reader-theme-green"
        : theme === "dark"
          ? "reader-theme-dark"
          : "";

  const themes = [
    { id: "default", label: "默认", color: "#faf8f5", textColor: "#2c2c2c" },
    { id: "sepia", label: "护眼", color: "#f4ecd8", textColor: "#5b4636" },
    { id: "green", label: "绿意", color: "#c7edcc", textColor: "#1a3a1a" },
    { id: "dark", label: "夜间", color: "#1a1a1a", textColor: "#c8c4bf" },
  ];

  const progress = chapters.length > 0
    ? Math.round(((currentIndex + 1) / chapters.length) * 100)
    : 0;

  return (
    <div className={`max-w-3xl mx-auto ${themeClass}`}>
      {/* Reader Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-card/95 backdrop-blur-md border-b rounded-t-lg"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSidebar(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-accent/50 transition-colors"
        >
          <span>📑</span>
          目录
        </motion.button>

        <div className="flex-1 mx-4">
          <p className="text-sm text-center text-foreground truncate">
            {currentContent?.title || "加载中..."}
          </p>
          <div className="w-full h-0.5 bg-muted rounded-full mt-1 overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-accent/50 transition-colors"
        >
          <span>⚙️</span>
          设置
        </motion.button>
      </motion.div>

      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-80 bg-card border-l shadow-2xl"
            >
              <div className="p-4 border-b flex items-center justify-between bg-card">
                <div>
                  <h3 className="font-serif font-semibold">目录</h3>
                  <p className="text-xs text-muted-foreground">
                    共 {chapters.length} 章
                  </p>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto h-[calc(100vh-80px)]">
                {chapters.map((ch) => (
                  <button
                    key={`${ch.url}-${ch.index}`}
                    onClick={() => {
                      loadContent(ch.index);
                      setShowSidebar(false);
                    }}
                    className={`
                      block w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-border/50
                      ${ch.index === currentIndex
                        ? "bg-primary/10 text-primary font-medium"
                        : ch.isVolume
                          ? "font-semibold text-muted-foreground bg-secondary/30"
                          : "text-foreground hover:bg-accent/30"
                      }
                    `}
                  >
                    <span className="truncate block">{ch.title}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="font-serif font-semibold text-lg mb-6">阅读设置</h3>

              {/* Font Size */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-muted-foreground">字号</label>
                  <span className="text-sm font-medium">{fontSize}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">A</span>
                  <input
                    type="range"
                    min={12}
                    max={32}
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-lg text-muted-foreground">A</span>
                </div>
              </div>

              {/* Line Height */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-muted-foreground">行距</label>
                  <span className="text-sm font-medium">{lineHeight.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={lineHeight}
                  onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Theme */}
              <div className="mb-6">
                <label className="text-sm text-muted-foreground block mb-3">主题</label>
                <div className="flex gap-3">
                  {themes.map((t) => (
                    <motion.button
                      key={t.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setTheme(t.id)}
                      className={`
                        w-14 h-14 rounded-xl border-2 transition-all shadow-sm
                        ${theme === t.id
                          ? "border-primary shadow-md"
                          : "border-transparent hover:border-border"
                        }
                      `}
                      style={{ backgroundColor: t.color }}
                      title={t.label}
                    >
                      <span
                        className="text-xs font-medium"
                        style={{ color: t.textColor }}
                      >
                        {t.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowSettings(false)}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                完成
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div
        ref={contentRef}
        className="px-6 py-8 min-h-[60vh] bg-reader-bg transition-colors duration-300"
      >
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full"
            />
          </div>
        ) : currentContent ? (
          <article key={`chapter-${currentContent.index}`}>
            <h2
              className="text-2xl font-serif font-bold mb-8 text-center text-reader-text"
            >
              {currentContent.title}
            </h2>
            <div
              className="prose max-w-none text-reader-text whitespace-pre-wrap break-words leading-relaxed"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
              }}
            >
              {currentContent.content}
            </div>
          </article>
        ) : (
          <p className="text-center text-muted-foreground py-20">内容加载失败</p>
        )}
      </div>

      {/* Back to top button */}
      <AnimatePresence>
        {showTopBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-8 right-8 z-40 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          >
            ↑
          </motion.button>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between px-6 py-8 border-t"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => currentIndex > 0 && loadContent(currentIndex - 1)}
          disabled={currentIndex <= 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm border hover:bg-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span>←</span>
          上一章
        </motion.button>

        <span className="text-sm text-muted-foreground font-medium">
          {currentIndex + 1} / {chapters.length || "?"}
        </span>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() =>
            chapters.length > 0 &&
            currentIndex < chapters.length - 1 &&
            loadContent(currentIndex + 1)
          }
          disabled={chapters.length === 0 || currentIndex >= chapters.length - 1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm border hover:bg-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          下一章
          <span>→</span>
        </motion.button>
      </motion.div>
    </div>
  );
}

export default function ReadPage() {
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
      <ReaderContent />
    </Suspense>
  );
}

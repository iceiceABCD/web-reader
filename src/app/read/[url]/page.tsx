"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { BookChapter } from "@/lib/types";

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
  const initialIndex = parseInt(searchParams.get("index") || "0");

  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [currentContent, setCurrentContent] = useState<ChapterContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchChapters = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(decodedUrl)}/chapters`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setChapters(data);
      }
    } catch {
      // ignore
    }
  }, [decodedUrl]);

  const fetchContent = useCallback(
    async (index: number) => {
      if (index < 0 || (chapters.length > 0 && index >= chapters.length)) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/books/${encodeURIComponent(decodedUrl)}/content?index=${index}`
        );
        if (res.ok) {
          const data = await res.json();
          setCurrentContent(data);
          setCurrentIndex(index);
          window.scrollTo(0, 0);

          fetch(`/api/books/${encodeURIComponent(decodedUrl)}/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ durChapterIndex: index, durChapterPos: 0 }),
          }).catch(() => {});
        }
      } finally {
        setLoading(false);
      }
    },
    [decodedUrl, chapters.length]
  );

  const [initialized, setInitialized] = useState(false);

  if (!initialized) {
    fetchChapters().then(() => {
      if (chapters.length > 0) {
        fetchContent(currentIndex);
      }
    });
    setInitialized(true);
  }

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
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        fetchContent(currentIndex - 1);
      } else if (
        e.key === "ArrowRight" &&
        (chapters.length === 0 || currentIndex < chapters.length - 1)
      ) {
        fetchContent(currentIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [currentIndex, chapters.length, fetchContent]);

  const themeClass =
    theme === "sepia"
      ? "reader-theme-sepia"
      : theme === "green"
        ? "reader-theme-green"
        : theme === "dark"
          ? "reader-theme-dark"
          : "";

  const themes = [
    { id: "default", label: "默认", color: "#faf9f6" },
    { id: "sepia", label: "护眼", color: "#f4ecd8" },
    { id: "green", label: "绿意", color: "#c7edcc" },
    { id: "dark", label: "夜间", color: "#1a1a1a" },
  ];

  return (
    <div className={`max-w-3xl mx-auto ${themeClass}`}>
      <div className="sticky top-14 z-40 flex items-center justify-between px-2 py-2 bg-card/80 backdrop-blur-sm border-b">
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="px-3 py-1 rounded text-sm hover:bg-accent"
        >
          目录
        </button>
        <span className="text-sm text-muted-foreground">
          {currentContent?.title || "加载中..."}
          {chapters.length > 0 && ` (${currentIndex + 1}/${chapters.length})`}
        </span>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-3 py-1 rounded text-sm hover:bg-accent"
        >
          设置
        </button>
      </div>

      {showSidebar && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/50"
            onClick={() => setShowSidebar(false)}
          />
          <div className="w-72 bg-card border-l overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">目录</h3>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-sm text-muted-foreground"
              >
                关闭
              </button>
            </div>
            <div className="p-2">
              {chapters.map((ch) => (
                <button
                  key={`${ch.url}-${ch.index}`}
                  onClick={() => {
                    fetchContent(ch.index);
                    setShowSidebar(false);
                  }}
                  className={`block w-full text-left px-3 py-1.5 text-sm rounded truncate ${
                    ch.index === currentIndex
                      ? "bg-primary text-primary-foreground"
                      : ch.isVolume
                        ? "font-semibold text-muted-foreground"
                        : "hover:bg-accent"
                  }`}
                >
                  {ch.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSettings(false)} />
          <div className="relative bg-card rounded-lg p-6 w-80 space-y-4">
            <h3 className="font-semibold">阅读设置</h3>
            <div>
              <label className="text-sm text-muted-foreground">字号: {fontSize}px</label>
              <input
                type="range"
                min={12}
                max={32}
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">行距: {lineHeight.toFixed(1)}</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={lineHeight}
                onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-2">主题</label>
              <div className="flex gap-2">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`w-10 h-10 rounded-full border-2 ${theme === t.id ? "border-primary" : "border-border"}`}
                    style={{ backgroundColor: t.color }}
                    title={t.label}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm"
            >
              确定
            </button>
          </div>
        </div>
      )}

      <div ref={contentRef} className="px-4 py-6 min-h-[60vh]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : currentContent ? (
          <>
            <h2 className="text-xl font-bold mb-6 text-center text-reader-text">
              {currentContent.title}
            </h2>
            <div
              className="prose max-w-none text-reader-text whitespace-pre-wrap break-words"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
              }}
            >
              {currentContent.content}
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-20">内容加载失败</p>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-6 border-t">
        <button
          onClick={() => currentIndex > 0 && fetchContent(currentIndex - 1)}
          disabled={currentIndex <= 0}
          className="px-4 py-2 rounded-md text-sm border hover:bg-accent disabled:opacity-30"
        >
          上一章
        </button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {chapters.length || "?"}
        </span>
        <button
          onClick={() =>
            chapters.length > 0 &&
            currentIndex < chapters.length - 1 &&
            fetchContent(currentIndex + 1)
          }
          disabled={chapters.length === 0 || currentIndex >= chapters.length - 1}
          className="px-4 py-2 rounded-md text-sm border hover:bg-accent disabled:opacity-30"
        >
          下一章
        </button>
      </div>
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <ReaderContent />
    </Suspense>
  );
}

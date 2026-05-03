"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { BookSource } from "@/lib/types";
import Link from "next/link";

export default function SourcesPage() {
  const [sources, setSources] = useState<BookSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSources = () => {
    setLoading(true);
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    fetch(`/api/bookSources${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSources(data);
      })
      .catch((error) => {
        console.error("Failed to fetch sources:", error);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    fetch(`/api/bookSources${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSources(data);
      })
      .catch((error) => {
        console.error("Failed to fetch sources:", error);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSource = async (source: BookSource) => {
    await fetch(`/api/bookSources/${encodeURIComponent(source.bookSourceUrl)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...source, enabled: !source.enabled }),
    });
    fetchSources();
  };

  const deleteSource = async (source: BookSource) => {
    if (!confirm(`确定删除书源「${source.bookSourceName}」？`)) return;
    await fetch(`/api/bookSources/${encodeURIComponent(source.bookSourceUrl)}`, {
      method: "DELETE",
    });
    fetchSources();
  };

  const exportSources = () => {
    const json = JSON.stringify(sources, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookSources.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const groups = sources.reduce<Record<string, BookSource[]>>((acc, source) => {
    const group = source.bookSourceGroup || "未分组";
    if (!acc[group]) acc[group] = [];
    acc[group].push(source);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <h1 className="text-2xl font-serif font-semibold">书源管理</h1>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportSources}
            className="px-3 py-1.5 rounded-xl text-sm border hover:bg-accent"
          >
            导出
          </motion.button>
          <Link href="/sources/import">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-1.5 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              导入
            </motion.button>
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-4"
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchSources()}
          placeholder="搜索书源..."
          className="w-full h-10 rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </motion.div>

      <p className="text-sm text-muted-foreground mb-4">
        共 {sources.length} 个书源，已启用 {sources.filter((s) => s.enabled).length} 个
      </p>

      {Object.entries(groups).map(([group, groupSources]) => (
        <div key={group} className="mb-6">
          <h2 className="text-lg font-serif font-semibold mb-2">{group}</h2>
          <div className="space-y-2">
            {groupSources.map((source) => (
              <div key={source.bookSourceUrl} className={`flex items-center gap-3 p-3 rounded-xl border bg-card ${!source.enabled ? "opacity-50" : ""}`}>
                <button
                  onClick={() => toggleSource(source)}
                  className={`w-10 h-5 rounded-full transition-colors ${source.enabled ? "bg-primary" : "bg-muted"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${source.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <Link href={`/sources/${encodeURIComponent(source.bookSourceUrl)}`} className="font-medium text-sm hover:text-primary">
                    {source.bookSourceName}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">{source.bookSourceUrl}</p>
                </div>
                <div className="flex items-center gap-2">
                  {source.searchUrl && <span className="px-1.5 py-0.5 rounded-xl bg-green-100 text-green-700 text-[10px] dark:bg-green-900 dark:text-green-300">搜索</span>}
                  {source.exploreUrl && <span className="px-1.5 py-0.5 rounded-xl bg-blue-100 text-blue-700 text-[10px] dark:bg-blue-900 dark:text-blue-300">发现</span>}
                  <button onClick={() => deleteSource(source)} className="text-xs text-red-500 hover:text-red-700">删除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
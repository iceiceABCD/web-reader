"use client";

import { useState, useEffect } from "react";
import type { BookSource } from "@/lib/types";
import Link from "next/link";

export default function SourcesPage() {
  const [sources, setSources] = useState<BookSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

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

  const handleImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      let parsed;
      try {
        parsed = JSON.parse(importText);
      } catch {
        alert("JSON 格式错误，请检查输入");
        return;
      }
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const res = await fetch("/api/bookSources/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arr),
      });
      if (res.ok) {
        const count = (await res.json()).length;
        alert(`成功导入 ${count} 个书源`);
        setShowImport(false);
        setImportText("");
        fetchSources();
      } else {
        alert("导入失败");
      }
    } catch {
      alert("导入出错");
    } finally {
      setImporting(false);
    }
  };

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">书源管理</h1>
        <div className="flex gap-2">
          <button onClick={exportSources} className="px-3 py-1.5 rounded-md text-sm border hover:bg-accent">
            导出
          </button>
          <button onClick={() => setShowImport(true)} className="px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90">
            导入
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchSources()}
          placeholder="搜索书源..."
          className="w-full h-10 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        共 {sources.length} 个书源，已启用 {sources.filter((s) => s.enabled).length} 个
      </p>

      {showImport && (
        <div className="mb-6 p-4 rounded-lg border bg-card">
          <h3 className="font-medium mb-2">导入书源</h3>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="粘贴 Legado 书源 JSON..."
            className="w-full h-40 rounded-md border bg-background p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleImport} disabled={importing} className="px-4 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {importing ? "导入中..." : "确认导入"}
            </button>
            <button onClick={() => { setShowImport(false); setImportText(""); }} className="px-4 py-1.5 rounded-md text-sm border hover:bg-accent">
              取消
            </button>
          </div>
        </div>
      )}

      {Object.entries(groups).map(([group, groupSources]) => (
        <div key={group} className="mb-6">
          <h2 className="text-lg font-semibold mb-2">{group}</h2>
          <div className="space-y-2">
            {groupSources.map((source) => (
              <div key={source.bookSourceUrl} className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${!source.enabled ? "opacity-50" : ""}`}>
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
                  {source.searchUrl && <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] dark:bg-green-900 dark:text-green-300">搜索</span>}
                  {source.exploreUrl && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] dark:bg-blue-900 dark:text-blue-300">发现</span>}
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
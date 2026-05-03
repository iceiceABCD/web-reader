"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BookSource } from "@/lib/types";

type ImportMethod = "url" | "file" | "paste" | "batch";
type ImportPhase = "input" | "loading" | "preview" | "importing" | "done";

interface PreviewItem {
  source: BookSource;
  selected: boolean;
  status: "new" | "update" | "same";
}

const methods: { key: ImportMethod; label: string; icon: string }[] = [
  { key: "url", label: "网络地址", icon: "🌐" },
  { key: "file", label: "本地文件", icon: "📁" },
  { key: "paste", label: "粘贴导入", icon: "📋" },
  { key: "batch", label: "批量链接", icon: "📦" },
];

export default function SourceImportPage() {
  const router = useRouter();
  const [activeMethod, setActiveMethod] = useState<ImportMethod>("url");
  const [phase, setPhase] = useState<ImportPhase>("input");
  const [urlInput, setUrlInput] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [batchText, setBatchText] = useState("");
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewStats, setPreviewStats] = useState({ new: 0, update: 0, same: 0, total: 0 });
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importResult, setImportResult] = useState({ added: 0, updated: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetPhase = () => {
    setPhase("input");
    setError("");
    setWarnings([]);
    setPreviewItems([]);
    setPreviewStats({ new: 0, update: 0, same: 0, total: 0 });
  };

  const parseJsonText = (text: string): BookSource[] => {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("内容为空");

    let json: unknown;
    try {
      json = JSON.parse(trimmed);
    } catch {
      throw new Error("JSON 格式错误，请检查输入");
    }

    if (Array.isArray(json)) {
      return json.filter(
        (s): s is BookSource =>
          typeof s === "object" && s !== null && s.bookSourceUrl && s.bookSourceName
      );
    }

    if (typeof json === "object" && json !== null) {
      if ("bookSourceUrl" in json && "bookSourceName" in json) {
        return [json as BookSource];
      }
    }

    throw new Error("无法识别的 JSON 格式");
  };

  const handleUrlFetch = async () => {
    if (!urlInput.trim()) return;
    setPhase("loading");
    setError("");
    try {
      const res = await fetch("/api/bookSources/import/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "获取失败");
      await showPreview(data.sources, data.warnings || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "获取失败");
      setPhase("input");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json") && !file.name.toLowerCase().endsWith(".txt")) {
      setError("仅支持 .json 或 .txt 文件");
      return;
    }

    setPhase("loading");
    setError("");
    try {
      const text = await file.text();
      const sources = parseJsonText(text);
      if (sources.length === 0) throw new Error("文件中未找到有效书源");
      await showPreview(sources);
    } catch (e) {
      setError(e instanceof Error ? e.message : "文件解析失败");
      setPhase("input");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePasteParse = async () => {
    if (!pasteText.trim()) return;
    setPhase("loading");
    setError("");
    try {
      const sources = parseJsonText(pasteText);
      if (sources.length === 0) throw new Error("内容中未找到有效书源");
      await showPreview(sources);
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析失败");
      setPhase("input");
    }
  };

  const handleBatchFetch = async () => {
    const urls = batchText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("http"));

    if (urls.length === 0) {
      setError("请输入至少一个有效的 URL");
      return;
    }

    setPhase("loading");
    setError("");
    try {
      const allSources: BookSource[] = [];
      const allWarnings: string[] = [];

      const results = await Promise.allSettled(
        urls.map((url) =>
          fetch("/api/bookSources/import/fetch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          }).then((r) => r.json())
        )
      );

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === "fulfilled" && r.value.sources) {
          allSources.push(...r.value.sources);
          if (r.value.warnings) allWarnings.push(...r.value.warnings);
        } else {
          allWarnings.push(`URL #${i + 1} 获取失败`);
        }
      }

      if (allSources.length === 0) throw new Error("所有 URL 均获取失败");
      await showPreview(allSources, allWarnings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "批量获取失败");
      setPhase("input");
    }
  };

  const showPreview = async (sources: BookSource[] | Record<string, unknown>[], fetchWarnings?: string[]) => {
    const validSources = sources.filter(
      (s) => s.bookSourceUrl && s.bookSourceName
    ) as BookSource[];

    if (validSources.length === 0) {
      setError("未找到有效的书源数据");
      setPhase("input");
      return;
    }

    if (fetchWarnings && fetchWarnings.length > 0) {
      setWarnings(fetchWarnings);
    }

    try {
      const res = await fetch("/api/bookSources/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: validSources }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "预览失败");

      const items: PreviewItem[] = data.items.map(
        (item: { source: BookSource; status: "new" | "update" | "same" }) => ({
          source: item.source,
          selected: item.status !== "same",
          status: item.status,
        })
      );

      setPreviewItems(items);
      setPreviewStats(data.stats);
      setPhase("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "预览失败");
      setPhase("input");
    }
  };

  const toggleSelect = (index: number) => {
    setPreviewItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleSelectAll = () => {
    const allSelected = previewItems.every((i) => i.selected);
    setPreviewItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const handleImport = async () => {
    const selected = previewItems.filter((i) => i.selected).map((i) => i.source);
    if (selected.length === 0) return;

    setPhase("importing");
    setError("");

    try {
      const res = await fetch("/api/bookSources/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });

      if (!res.ok) throw new Error("导入失败");

      const results = await res.json();
      const added = results.filter(
        (r: Record<string, unknown>) => r
      ).length;

      setImportResult({ added, updated: selected.length - added > 0 ? selected.filter((_, i) => previewItems[i]?.status === "update").length : 0 });
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败");
      setPhase("preview");
    }
  };

  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPasteText(text);
    } catch {
      setError("无法读取剪贴板，请手动粘贴");
    }
  };

  const selectedCount = previewItems.filter((i) => i.selected).length;
  const selectedNew = previewItems.filter((i) => i.selected && i.status === "new").length;
  const selectedUpdate = previewItems.filter((i) => i.selected && i.status === "update").length;
  const selectedSame = previewItems.filter((i) => i.selected && i.status === "same").length;

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <Link
          href="/sources"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ← 返回
        </Link>
        <h1 className="text-2xl font-serif font-semibold">导入书源</h1>
      </motion.div>

      {phase !== "done" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <div className="flex gap-1 p-1 rounded-xl border bg-card">
            {methods.map((m) => (
              <button
                key={m.key}
                onClick={() => { setActiveMethod(m.key); resetPhase(); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm transition-colors ${
                  activeMethod === m.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-accent"
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </motion.div>
      )}

      {warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-3 rounded-xl border border-yellow-200 bg-yellow-50 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300"
        >
          <p className="font-medium mb-1">部分警告：</p>
          <ul className="list-disc list-inside space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {phase === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {activeMethod === "url" && (
              <div className="p-4 rounded-xl border bg-card space-y-3">
                <p className="text-sm text-muted-foreground">
                  输入书源链接，支持直接书源 JSON 或 sourceUrls 批量格式
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUrlFetch()}
                    placeholder="https://example.com/sources.json"
                    className="flex-1 h-10 rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUrlFetch}
                    disabled={!urlInput.trim()}
                    className="px-4 py-1.5 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-sm"
                  >
                    获取
                  </motion.button>
                </div>
              </div>
            )}

            {activeMethod === "file" && (
              <div className="p-4 rounded-xl border bg-card space-y-3">
                <p className="text-sm text-muted-foreground">
                  选择 .json 或 .txt 格式的书源文件
                </p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
                >
                  <span className="text-3xl mb-2">📁</span>
                  <p className="text-sm text-muted-foreground">点击选择文件</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">支持 .json / .txt</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {activeMethod === "paste" && (
              <div className="p-4 rounded-xl border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">粘贴 Legado 书源 JSON</p>
                  <button
                    onClick={handleClipboardPaste}
                    className="text-xs text-primary hover:underline"
                  >
                    从剪贴板粘贴
                  </button>
                </div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder='[{"bookSourceUrl":"...","bookSourceName":"..."}]'
                  className="w-full h-40 rounded-xl border bg-background p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePasteParse}
                    disabled={!pasteText.trim()}
                    className="px-4 py-1.5 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-sm"
                  >
                    解析
                  </motion.button>
                </div>
              </div>
            )}

            {activeMethod === "batch" && (
              <div className="p-4 rounded-xl border bg-card space-y-3">
                <p className="text-sm text-muted-foreground">
                  输入多个书源链接，每行一个
                </p>
                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder={"https://example.com/source1.json\nhttps://example.com/source2.json"}
                  className="w-full h-40 rounded-xl border bg-background p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBatchFetch}
                  disabled={!batchText.trim()}
                  className="px-4 py-1.5 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-sm"
                >
                  批量获取
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full"
            />
            <p className="text-sm text-muted-foreground mt-3">正在获取书源...</p>
          </motion.div>
        )}

        {phase === "preview" && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-primary hover:underline"
                >
                  {previewItems.every((i) => i.selected) ? "取消全选" : "全选"}
                </button>
                <span className="text-sm text-muted-foreground">
                  已选 {selectedCount} 个
                  {selectedNew > 0 && ` (${selectedNew} 新增`}
                  {selectedNew > 0 && selectedUpdate > 0 && ", "}
                  {selectedUpdate > 0 && `${selectedUpdate} 更新`}
                  {selectedNew > 0 || selectedUpdate > 0 ? ")" : ""}
                </span>
              </div>
              <button
                onClick={resetPhase}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                重新选择
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {previewItems.map((item, i) => (
                <div
                  key={item.source.bookSourceUrl}
                  className={`flex items-center gap-3 p-3 rounded-xl border bg-card transition-colors ${
                    !item.selected ? "opacity-60" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleSelect(i)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.source.bookSourceName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.source.bookSourceUrl}
                      {item.source.bookSourceGroup && ` · ${item.source.bookSourceGroup}`}
                    </p>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded-xl text-[10px] ${
                      item.status === "new"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : item.status === "update"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {item.status === "new" ? "新增" : item.status === "update" ? "更新" : "相同"}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
              <p className="text-sm text-muted-foreground">
                共 {previewStats.total} 个 · {previewStats.new} 新增 · {previewStats.update} 更新 · {previewStats.same} 相同
              </p>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push("/sources")}
                  className="px-4 py-1.5 rounded-xl text-sm border hover:bg-accent"
                >
                  取消
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleImport}
                  disabled={selectedCount === 0}
                  className="px-4 py-1.5 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-sm"
                >
                  确认导入 ({selectedCount})
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {phase === "importing" && (
          <motion.div
            key="importing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full"
            />
            <p className="text-sm text-muted-foreground mt-3">正在导入书源...</p>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <span className="text-4xl mb-3">✅</span>
            <p className="text-lg font-serif font-semibold mb-2">导入完成</p>
            <p className="text-sm text-muted-foreground mb-6">
              成功导入 {importResult.added + importResult.updated} 个书源
            </p>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { resetPhase(); setUrlInput(""); setPasteText(""); setBatchText(""); }}
                className="px-4 py-1.5 rounded-xl text-sm border hover:bg-accent"
              >
                继续导入
              </motion.button>
              <Link href="/sources">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-1.5 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  返回书源
                </motion.button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

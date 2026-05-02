"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function ImportPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError("");
    setFileName(file.name);
    setUploading(true);

    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith(".txt") && !fileNameLower.endsWith(".epub")) {
      setError("仅支持 TXT 和 EPUB 格式");
      setUploading(false);
      return;
    }

    const maxSize = fileNameLower.endsWith(".epub") ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`文件过大，${fileNameLower.endsWith(".epub") ? "EPUB" : "TXT"} 最大 ${maxSize / 1024 / 1024}MB`);
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "上传失败");
        return;
      }

      const data = await res.json();
      router.push(`/book/${encodeURIComponent(data.bookUrl)}`);
    } catch {
      setError("上传出错，请重试");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">导入书籍</h1>
        <p className="text-muted-foreground">支持 TXT 和 EPUB 格式，自动解析章节和封面</p>
      </motion.div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`
            relative border-2 rounded-2xl p-16 text-center cursor-pointer
            transition-all duration-300 ease-out
            ${dragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-dashed border-border hover:border-primary/40 hover:bg-accent/20"
            }
            ${uploading ? "pointer-events-none" : ""}
          `}
        >
          <AnimatePresence mode="wait">
            {uploading ? (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 mx-auto border-3 border-primary/20 border-t-primary rounded-full"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">正在解析书籍...</p>
                  <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <motion.div
                  animate={{ y: dragging ? -5 : 0 }}
                  className="text-5xl"
                >
                  {dragging ? "📥" : "📚"}
                </motion.div>
                <div>
                  <p className="text-lg font-medium text-foreground mb-1">
                    {dragging ? "松开以上传" : "点击或拖拽文件到此处"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    支持 TXT 和 EPUB 格式
                  </p>
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    TXT 最大 5MB
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    EPUB 最大 10MB
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.epub"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-center"
          >
            <p className="text-sm text-red-600">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-10 grid grid-cols-2 gap-4"
      >
        <div className="p-4 rounded-xl bg-secondary/50">
          <div className="text-2xl mb-2">📝</div>
          <h3 className="text-sm font-medium mb-1">TXT 文件</h3>
          <p className="text-xs text-muted-foreground">自动检测 UTF-8/GBK 编码，智能识别章节标题</p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/50">
          <div className="text-2xl mb-2">📖</div>
          <h3 className="text-sm font-medium mb-1">EPUB 文件</h3>
          <p className="text-xs text-muted-foreground">自动提取封面、目录结构和正文内容</p>
        </div>
      </motion.div>
    </div>
  );
}

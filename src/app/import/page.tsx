"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ImportPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0); // eslint-disable-line @typescript-eslint/no-unused-vars
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    setProgress(0);

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".txt") && !fileName.endsWith(".epub")) {
      setError("仅支持 TXT 和 EPUB 格式");
      setUploading(false);
      return;
    }

    const maxSize = fileName.endsWith(".epub") ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`文件过大，${fileName.endsWith(".epub") ? "EPUB" : "TXT"} 最大 ${maxSize / 1024 / 1024}MB`);
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
      <h1 className="text-2xl font-bold mb-6">导入书籍</h1>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 rounded-lg p-12 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-dashed border-muted-foreground/30 hover:border-primary/50"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        {uploading ? (
          <div className="space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-muted-foreground">正在解析上传...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-lg font-medium">点击或拖拽文件到此处</p>
            <p className="text-sm text-muted-foreground">
              支持 TXT 和 EPUB 格式
            </p>
            <p className="text-xs text-muted-foreground">
              EPUB 最大 10MB，TXT 最大 5MB
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.epub"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BookSource } from "@/lib/types";

function RuleInput({
  label,
  path,
  placeholder,
  source,
  onUpdate,
}: {
  label: string;
  path: string;
  placeholder?: string;
  source: BookSource;
  onUpdate: (path: string, value: unknown) => void;
}) {
  const keys = path.split(".");
  let value: unknown = source;
  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
  }
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
      <label className="text-sm text-muted-foreground">{label}</label>
      <input
        type="text"
        value={(value as string) ?? ""}
        onChange={(e) => onUpdate(path, e.target.value)}
        placeholder={placeholder}
        className="h-8 rounded border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

export default function SourceDetailPage({
  params,
}: {
  params: Promise<{ url: string }>;
}) {
  const [source, setSource] = useState<BookSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decodedUrl, setDecodedUrl] = useState("");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    params.then(async (p) => {
      const du = decodeURIComponent(p.url);
      setDecodedUrl(du);
      try {
        const res = await fetch(`/api/bookSources/${encodeURIComponent(du)}`);
        if (res.ok && !cancelled) {
          setSource(await res.json());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [params]);

  const handleSave = async () => {
    if (!source) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/bookSources/${encodeURIComponent(decodedUrl)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(source),
      });
      if (res.ok) {
        alert("保存成功");
        router.push("/sources");
      }
    } finally {
      setSaving(false);
    }
  };

  const updateField = useCallback((path: string, value: unknown) => {
    setSource((prev) => {
      if (!prev) return prev;
      const newSource = { ...prev };
      const keys = path.split(".");
      let obj: Record<string, unknown> = newSource as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...(obj[keys[i]] as object) };
        obj = obj[keys[i]] as Record<string, unknown>;
      }
      obj[keys[keys.length - 1]] = value;
      return newSource as BookSource;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!source) {
    return <div className="text-center py-10">书源未找到</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">编辑书源</h1>
        <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving ? "保存中..." : "保存"}
        </button>
      </div>

      <div className="space-y-6">
        <section className="p-4 rounded-lg border bg-card space-y-3">
          <h2 className="font-semibold">基本信息</h2>
          <RuleInput label="名称" path="bookSourceName" source={source} onUpdate={updateField} />
          <RuleInput label="地址" path="bookSourceUrl" source={source} onUpdate={updateField} />
          <RuleInput label="分组" path="bookSourceGroup" source={source} onUpdate={updateField} />
          <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
            <label className="text-sm text-muted-foreground">类型</label>
            <select value={source.bookSourceType} onChange={(e) => updateField("bookSourceType", parseInt(e.target.value))} className="h-8 rounded border bg-background px-2 text-sm">
              <option value={0}>文本</option>
              <option value={1}>音频</option>
              <option value={2}>图片</option>
            </select>
          </div>
          <RuleInput label="URL正则" path="bookUrlPattern" source={source} onUpdate={updateField} />
          <RuleInput label="请求头" path="header" placeholder="JSON格式" source={source} onUpdate={updateField} />
          <RuleInput label="登录URL" path="loginUrl" source={source} onUpdate={updateField} />
        </section>

        <section className="p-4 rounded-lg border bg-card space-y-3">
          <h2 className="font-semibold">搜索规则</h2>
          <RuleInput label="搜索URL" path="searchUrl" source={source} onUpdate={updateField} />
          <RuleInput label="书籍列表" path="ruleSearch.bookList" source={source} onUpdate={updateField} />
          <RuleInput label="书名" path="ruleSearch.name" source={source} onUpdate={updateField} />
          <RuleInput label="作者" path="ruleSearch.author" source={source} onUpdate={updateField} />
          <RuleInput label="简介" path="ruleSearch.intro" source={source} onUpdate={updateField} />
          <RuleInput label="分类" path="ruleSearch.kind" source={source} onUpdate={updateField} />
          <RuleInput label="书籍URL" path="ruleSearch.bookUrl" source={source} onUpdate={updateField} />
          <RuleInput label="封面URL" path="ruleSearch.coverUrl" source={source} onUpdate={updateField} />
          <RuleInput label="最新章节" path="ruleSearch.lastChapter" source={source} onUpdate={updateField} />
          <RuleInput label="字数" path="ruleSearch.wordCount" source={source} onUpdate={updateField} />
        </section>

        <section className="p-4 rounded-lg border bg-card space-y-3">
          <h2 className="font-semibold">发现规则</h2>
          <RuleInput label="发现URL" path="exploreUrl" source={source} onUpdate={updateField} />
          <RuleInput label="书籍列表" path="ruleExplore.bookList" source={source} onUpdate={updateField} />
          <RuleInput label="书名" path="ruleExplore.name" source={source} onUpdate={updateField} />
          <RuleInput label="作者" path="ruleExplore.author" source={source} onUpdate={updateField} />
          <RuleInput label="书籍URL" path="ruleExplore.bookUrl" source={source} onUpdate={updateField} />
          <RuleInput label="封面URL" path="ruleExplore.coverUrl" source={source} onUpdate={updateField} />
        </section>

        <section className="p-4 rounded-lg border bg-card space-y-3">
          <h2 className="font-semibold">详情规则</h2>
          <RuleInput label="初始化" path="ruleBookInfo.init" source={source} onUpdate={updateField} />
          <RuleInput label="书名" path="ruleBookInfo.name" source={source} onUpdate={updateField} />
          <RuleInput label="作者" path="ruleBookInfo.author" source={source} onUpdate={updateField} />
          <RuleInput label="简介" path="ruleBookInfo.intro" source={source} onUpdate={updateField} />
          <RuleInput label="封面URL" path="ruleBookInfo.coverUrl" source={source} onUpdate={updateField} />
          <RuleInput label="目录URL" path="ruleBookInfo.tocUrl" source={source} onUpdate={updateField} />
        </section>

        <section className="p-4 rounded-lg border bg-card space-y-3">
          <h2 className="font-semibold">目录规则</h2>
          <RuleInput label="章节列表" path="ruleToc.chapterList" source={source} onUpdate={updateField} />
          <RuleInput label="章节名" path="ruleToc.chapterName" source={source} onUpdate={updateField} />
          <RuleInput label="章节URL" path="ruleToc.chapterUrl" source={source} onUpdate={updateField} />
          <RuleInput label="下一页" path="ruleToc.nextTocUrl" source={source} onUpdate={updateField} />
          <RuleInput label="是否分卷" path="ruleToc.isVolume" source={source} onUpdate={updateField} />
        </section>

        <section className="p-4 rounded-lg border bg-card space-y-3">
          <h2 className="font-semibold">正文规则</h2>
          <RuleInput label="正文" path="ruleContent.content" source={source} onUpdate={updateField} />
          <RuleInput label="下一页" path="ruleContent.nextContentUrl" source={source} onUpdate={updateField} />
          <RuleInput label="标题" path="ruleContent.title" source={source} onUpdate={updateField} />
          <RuleInput label="替换规则" path="ruleContent.replaceRegex" source={source} onUpdate={updateField} />
        </section>
      </div>
    </div>
  );
}

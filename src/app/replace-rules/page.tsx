"use client";

import { useState, useEffect } from "react";
import type { ReplaceRule } from "@/lib/types";

export default function ReplaceRulesPage() {
  const [rules, setRules] = useState<ReplaceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState<Partial<ReplaceRule> | null>(null);

  const fetchRules = () => {
    fetch("/api/replaceRules")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRules(data);
      })
      .catch((error) => {
        console.error("Failed to fetch replace rules:", error);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const saveRule = async () => {
    if (!editRule?.name || !editRule?.pattern) {
      alert("名称和替换规则不能为空");
      return;
    }
    if (editRule.id) {
      await fetch(`/api/replaceRules/${editRule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editRule),
      });
    } else {
      await fetch("/api/replaceRules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editRule),
      });
    }
    setShowForm(false);
    setEditRule(null);
    fetchRules();
  };

  const deleteRule = async (id: number) => {
    if (!confirm("确定删除此规则？")) return;
    await fetch(`/api/replaceRules/${id}`, { method: "DELETE" });
    fetchRules();
  };

  const toggleRule = async (rule: ReplaceRule) => {
    await fetch(`/api/replaceRules/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rule, enabled: !rule.enabled }),
    });
    fetchRules();
  };

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
        <h1 className="text-2xl font-bold">替换净化</h1>
        <button
          onClick={() => {
            setEditRule({ name: "", pattern: "", replacement: "", isRegex: false, enabled: true, sortOrder: 0 });
            setShowForm(true);
          }}
          className="px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90"
        >
          新建规则
        </button>
      </div>

      {showForm && editRule && (
        <div className="mb-6 p-4 rounded-lg border bg-card space-y-3">
          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
            <label className="text-sm text-muted-foreground">名称</label>
            <input
              type="text"
              value={editRule.name || ""}
              onChange={(e) => setEditRule({ ...editRule, name: e.target.value })}
              className="h-8 rounded border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
            <label className="text-sm text-muted-foreground">分组</label>
            <input
              type="text"
              value={editRule.group || ""}
              onChange={(e) => setEditRule({ ...editRule, group: e.target.value })}
              className="h-8 rounded border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
            <label className="text-sm text-muted-foreground">替换规则</label>
            <input
              type="text"
              value={editRule.pattern || ""}
              onChange={(e) => setEditRule({ ...editRule, pattern: e.target.value })}
              className="h-8 rounded border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="要替换的内容"
            />
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
            <label className="text-sm text-muted-foreground">替换为</label>
            <input
              type="text"
              value={editRule.replacement || ""}
              onChange={(e) => setEditRule({ ...editRule, replacement: e.target.value })}
              className="h-8 rounded border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="留空则删除匹配内容"
            />
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
            <label className="text-sm text-muted-foreground">作用范围</label>
            <input
              type="text"
              value={editRule.scope || ""}
              onChange={(e) => setEditRule({ ...editRule, scope: e.target.value })}
              className="h-8 rounded border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="书名或源名，留空则全部生效"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editRule.isRegex || false}
                onChange={(e) => setEditRule({ ...editRule, isRegex: e.target.checked })}
              />
              使用正则表达式
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveRule}
              className="px-4 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              保存
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditRule(null);
              }}
              className="px-4 py-1.5 rounded-md text-sm border hover:bg-accent"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">暂无替换规则</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${!rule.enabled ? "opacity-50" : ""}`}
            >
              <button
                onClick={() => toggleRule(rule)}
                className={`w-10 h-5 rounded-full transition-colors ${rule.enabled ? "bg-primary" : "bg-muted"}`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${rule.enabled ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{rule.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {rule.isRegex && "[正则] "}{rule.pattern} → {rule.replacement || "(删除)"}
                </p>
                {rule.scope && (
                  <p className="text-xs text-muted-foreground">范围: {rule.scope}</p>
                )}
              </div>
              <button
                onClick={() => rule.id && deleteRule(rule.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
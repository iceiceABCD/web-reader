# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Web 版 Legado (阅读) 小说阅读器，基于 Next.js 16 + React 19 + Tailwind CSS，部署在 Vercel Serverless Functions 上。核心是规则引擎——解析 Legado 书源规则语法来抓取和解析网页内容。

## 常用命令

```bash
npm run dev          # 开发服务器 (localhost:3000)
npm run build        # 生产构建
npm run lint         # ESLint 检查
npx tsc --noEmit     # TypeScript 类型检查 (CI 也用这个)
npm run db:push      # 推送 Schema 到数据库 (开发用)
npm run db:generate  # 生成数据库迁移
npm run db:studio    # Drizzle Studio 可视化管理
```

数据库需要先 `cp .env.example .env.local` 并填入 `DATABASE_URL`。

## 架构要点

### 认证
- NextAuth v5 (beta)，Credentials Provider，JWT session strategy
- 所有数据按 userId 隔离（书源、书籍、章节、替换规则、阅读进度都带 userId 字段）
- middleware.ts 全局拦截：仅 `/login`、`/register`、`/api/auth` 为公开路径，其余需登录
- API 路由统一通过 `getUserId()` / `unauthorized()` 鉴权（来自 `auth-helpers.ts`）

### 数据库 (Drizzle ORM + Neon Postgres)
- Schema 在 `src/lib/db/schema.ts`：users、bookSources、books、chapters、replaceRules、readProgress
- 连接在 `src/lib/db/index.ts`：单例 `getDb()`，使用 neon serverless HTTP driver
- 多数表用复合主键（如 `(bookUrl, userId)`）而非自增 id，与 Legado 数据模型保持一致
- `dbToSource()` 将 DB 行转为 BookSource 类型（null → undefined）

### 规则引擎 (src/lib/rule-engine/) — 项目核心
- **parser.ts**: 规则语法解析——`@css:` / `@json:` / `@regex:` / `@js:` 前缀识别，`##` 链式规则分割，`{{key}}` 模板变量，`@put:{}` / `@get:{}` 变量存取
- **css-selector.ts**: cheerio 实现 CSS 选择器提取
- **jsonpath.ts**: jsonpath-plus 实现 JSONPath 提取
- **content-fetcher.ts**: ofetch + iconv-lite HTTP 代理，自动检测编码（含 GBK/GB2312），返回 HTML 或 JSON
- **url-analyzer.ts**: URL 模板解析——searchUrl 中的 POST 配置 `{method, body, charset}`，exploreUrl 的 `标题::URL` 分类格式，相对 URL 拼接
- **source-executor.ts**: 顶层执行器——search / getBookInfo / getChapterList / getContent / explore，串联规则解析→内容抓取→规则提取

### API 路由设计
- 所有 `/api/` 路由在 `src/app/api/` 下，按 Next.js App Router convention（route.ts）
- 动态路径用 `[url]`，URL 编码后的 bookUrl 作为路径参数，路由内 `decodeURIComponent` 解码
- 搜索 API 并发限制为 5 个书源同时搜索 (`concurrencyLimit = 5`)
- 书源导入 API (`/api/bookSources/import`) 通过内部 fetch 转发到 `/api/bookSources` POST

### 前端页面
- 页面在 `src/app/` 下：书架(`/`)、搜索(`/search`)、发现(`/explore`)、书源(`/sources`)、书籍详情(`/book/[url]`)、阅读器(`/read/[url]`)、替换净化(`/replace-rules`)、登录(`/login`)、注册(`/register`)
- 全局布局：SessionProvider + NavBar（sticky 导航栏），`max-w-7xl` 容器
- 简繁转换工具在 `src/lib/utils/chinese.ts`（opencc-js）

### Vercel 部署配置
- `vercel.json`: region `hnd1` (东京)，framework `nextjs`
- `next.config.ts`: serverActions bodySizeLimit 10mb，images 允许所有 https 远程域名

## 关键约定

- 路径别名 `@/*` 映射 `./src/*`（在 tsconfig.json paths 中配置）
- 所有 API 路由和页面都是 Server Component / Route Handler，仅在 NavBar 等交互组件用 `"use client"`
- 数据库表名和列名用 snake_case（Drizzle 映射），TypeScript 类型用 camelCase
- 规则引擎不支持：完整 XPath、Rhino JS 引擎、Cookie 自动管理、登录流程
- CI (GitHub Actions): lint + type-check + build，在 push/PR 到 main 分支时触发
# 阅读 Web - Web Reader

基于 [Legado (阅读)](https://github.com/gedoor/legado) 核心功能的 Web 版小说阅读器，支持部署在 Vercel 上。

## 功能

- **书源管理** — 多种导入方式（URL/文件/剪贴板/批量链接）、预览选择、导出 Legado JSON 格式书源
- **多源搜索** — 并发搜索多个书源，支持指定书源搜索
- **本地导入** — 直接上传 TXT/EPUB 文件，自动解析章节和封面
- **在线阅读** — 章节目录、上下滚动阅读、字号/行距/主题调节
- **阅读进度** — 自动保存阅读进度，跨设备同步
- **替换净化** — 正则/普通文本替换，去除广告和错别字
- **规则引擎** — CSS 选择器 + JSONPath + 正则 + 基础 JS，链式规则
- **模式切换** — 服务模式多人使用，私人模式单人独享
- **阅读体验** — 温暖阅读配色、Framer Motion 内容入场动画、自定义滚动条

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 + React 19 + Tailwind CSS |
| 字体 | Noto Serif SC（标题）+ Noto Sans SC（正文） |
| 动效 | Framer Motion（页面内容入场动画） |
| 数据库 | Vercel Postgres (Neon) |
| ORM | Drizzle ORM |
| 规则引擎 | cheerio (CSS) + jsonpath-plus (JSONPath) |
| 本地解析 | epub2 (EPUB) + iconv-lite (TXT/GBK) |
| HTTP 代理 | ofetch + iconv-lite (GBK 支持) |
| 部署 | Vercel Serverless Functions |

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/ksbbs/web-reader.git
cd reader
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env.local` 并填入值：

```bash
cp .env.example .env.local
```

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是 | Neon Postgres 连接字符串 |
| `AUTH_SECRET` | 是 | JWT 密钥，用 `openssl rand -base64 32` 生成 |
| `AUTH_URL` | 是 | 部署后的域名，如 `https://your-app.vercel.app` |
| `APP_MODE` | 否 | `server`（默认，多人使用）或 `private`（单人模式） |
| `ADMIN_EMAIL` | 私人模式必填 | 管理员邮箱，首次登录自动创建账号 |
| `ADMIN_PASSWORD` | 私人模式必填 | 管理员密码 |

### 3. 初始化数据库

在 [Vercel Dashboard](https://vercel.com/dashboard) 创建 Postgres 数据库，然后：

```bash
npm run db:push
```

**如果无法在本地运行 `db:push`**（比如只在 Vercel 上部署），可以在 Neon Console 的 SQL Editor 中执行以下建表语句：

```sql
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "book_sources" (
  "book_source_url" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "book_source_name" text NOT NULL,
  "book_source_group" text,
  "book_source_type" integer DEFAULT 0 NOT NULL,
  "book_url_pattern" text,
  "custom_order" integer DEFAULT 0 NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "enabled_explore" boolean DEFAULT true NOT NULL,
  "enabled_cookie_jar" boolean DEFAULT true,
  "concurrent_rate" text,
  "header" text,
  "login_url" text,
  "login_ui" text,
  "login_check_js" text,
  "book_source_comment" text,
  "variable_comment" text,
  "last_update_time" bigint DEFAULT 0 NOT NULL,
  "respond_time" bigint DEFAULT 180000 NOT NULL,
  "weight" integer DEFAULT 0 NOT NULL,
  "explore_url" text,
  "search_url" text,
  "rule_search" jsonb,
  "rule_explore" jsonb,
  "rule_book_info" jsonb,
  "rule_toc" jsonb,
  "rule_content" jsonb,
  "rule_review" jsonb,
  "created_at" timestamp DEFAULT now(),
  PRIMARY KEY ("book_source_url", "user_id")
);
CREATE INDEX IF NOT EXISTS "idx_book_sources_user_id" ON "book_sources" ("user_id");

CREATE TABLE IF NOT EXISTS "books" (
  "book_url" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "toc_url" text DEFAULT '' NOT NULL,
  "origin" text DEFAULT 'local' NOT NULL,
  "origin_name" text DEFAULT '' NOT NULL,
  "name" text NOT NULL,
  "author" text DEFAULT '' NOT NULL,
  "kind" text,
  "cover_url" text,
  "intro" text,
  "type" integer DEFAULT 0 NOT NULL,
  "latest_chapter_title" text,
  "total_chapter_num" integer DEFAULT 0 NOT NULL,
  "dur_chapter_index" integer DEFAULT 0 NOT NULL,
  "dur_chapter_pos" integer DEFAULT 0 NOT NULL,
  "dur_chapter_time" bigint DEFAULT 0 NOT NULL,
  "word_count" text,
  "can_update" boolean DEFAULT true NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  "variable" text,
  "created_at" timestamp DEFAULT now(),
  PRIMARY KEY ("book_url", "user_id")
);
CREATE INDEX IF NOT EXISTS "idx_books_user_id" ON "books" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_books_name_author" ON "books" ("name", "author");

CREATE TABLE IF NOT EXISTS "chapters" (
  "url" text NOT NULL,
  "book_url" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "chapter_index" integer NOT NULL,
  "is_volume" boolean DEFAULT false NOT NULL,
  "is_vip" boolean DEFAULT false NOT NULL,
  "is_pay" boolean DEFAULT false NOT NULL,
  "resource_url" text,
  "variable" text,
  PRIMARY KEY ("url", "book_url", "user_id")
);
CREATE INDEX IF NOT EXISTS "idx_chapters_book_url" ON "chapters" ("book_url", "user_id");
CREATE INDEX IF NOT EXISTS "idx_chapters_book_url_index" ON "chapters" ("book_url", "chapter_index", "user_id");

CREATE TABLE IF NOT EXISTS "replace_rules" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "group_name" text,
  "pattern" text NOT NULL,
  "replacement" text DEFAULT '' NOT NULL,
  "is_regex" boolean DEFAULT false NOT NULL,
  "scope" text,
  "enabled" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "read_progress" (
  "book_url" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "dur_chapter_index" integer DEFAULT 0 NOT NULL,
  "dur_chapter_pos" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now(),
  PRIMARY KEY ("book_url", "user_id")
);

CREATE TABLE IF NOT EXISTS "chapter_content" (
  "book_url" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "chapter_index" integer NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  PRIMARY KEY ("book_url", "user_id", "chapter_index")
);
CREATE INDEX IF NOT EXISTS "idx_chapter_content_book" ON "chapter_content" ("book_url", "user_id");
```

操作步骤：Neon Console → 你的项目 → 左侧 **SQL Editor** → 粘贴上方 SQL → 点击 **Run**。

### 4. 本地开发

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 部署到 Vercel

#### 方式一：Dashboard 导入（推荐，最简单）

1. **Fork 仓库**：点击 GitHub 仓库右上角 Fork 按钮，将项目 Fork 到你的账号下

2. **创建 Vercel 项目**：
   - 打开 [vercel.com](https://vercel.com)，用 GitHub 账号登录
   - 点击 **「Add New...」→「Project」**
   - 在列表中找到你 Fork 的 `web-reader` 仓库，点击 **「Import」**

3. **创建数据库**：
   - 在 Import 页面，展开 **「Storage」** 标签
   - 点击 **「Create Database」**，选择 **「Postgres (Neon)」**
   - 点击 **「Create」** 创建数据库
   - 创建完成后，`DATABASE_URL` 环境变量会自动注入到项目中

4. **配置环境变量**：
   - 回到 Import 页面，展开 **「Environment Variables」** 标签
   - 添加以下变量：

   | Key | Value | 说明 |
   |-----|-------|------|
   | `AUTH_SECRET` | 随机字符串 | 在终端运行 `openssl rand -base64 32` 生成，或使用任意 32 位以上随机字符串 |
   | `AUTH_URL` | `https://你的项目名.vercel.app` | 先填入预计的域名，部署后可在 Settings 中修改为实际域名 |
   | `APP_MODE` | `server` 或 `private` | 不填则默认为 `server`（多人模式） |
   | `ADMIN_EMAIL` | 你的邮箱 | 仅私人模式需要 |
   | `ADMIN_PASSWORD` | 你的密码 | 仅私人模式需要 |

5. **点击「Deploy」**，等待部署完成

6. **修改 AUTH_URL**（如需）：
   - 部署完成后，Vercel 会分配一个实际域名（如 `web-reader-xxx.vercel.app`）
   - 进入项目 **Settings → Environment Variables**
   - 将 `AUTH_URL` 更新为实际域名（如 `https://web-reader-xxx.vercel.app`）
   - 点击 **Deployments → 最新部署 → Redeploy** 重新部署使变量生效

7. **初始化数据库**：
   - 在本地克隆你 Fork 的仓库并安装依赖：
     ```bash
     git clone https://github.com/你的用户名/web-reader.git
     cd web-reader
     npm install
     ```
   - 在 Vercel 项目 **Settings → Storage → Postgres → .env.local** 标签页中复制 `DATABASE_URL`
   - 创建 `.env.local` 文件并粘贴：
     ```bash
     echo "DATABASE_URL=复制的连接字符串" > .env.local
     ```
   - 推送数据库 Schema：
     ```bash
     npm run db:push
     ```
   - 完成后可以删除 `.env.local`，本地不再需要

8. **开始使用**：访问你的域名，注册账号即可使用

#### 方式二：CLI 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署（首次会引导你创建项目）
vercel

# 部署后配置环境变量
vercel env add AUTH_SECRET
vercel env add AUTH_URL
# 如果使用私人模式
vercel env add APP_MODE
vercel env add ADMIN_EMAIL
vercel env add ADMIN_PASSWORD

# 重新部署使环境变量生效
vercel --prod
```

数据库创建和 Schema 推送步骤同方式一的步骤 3 和 7。

#### 部署后注意事项

- **自定义域名**：在 Vercel 项目 Settings → Domains 中绑定自定义域名后，需同步更新 `AUTH_URL` 环境变量
- **数据持久性**：Neon Postgres 免费版有存储限制（512MB），注意数据量
- **Serverless 限制**：Vercel 免费版 Serverless Function 超时为 10 秒，部分书源请求可能超时

## 运行模式

通过 `APP_MODE` 环境变量切换：

### 服务模式 (`APP_MODE=server`，默认)

- 多人使用，允许注册新账号
- 登录页显示「注册」链接
- 适合公开部署给多人使用

### 私人模式 (`APP_MODE=private`)

- 禁止注册，仅一个管理员账号
- 首次登录时用 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 自动创建管理员
- 登录页隐藏注册链接，注册页自动重定向
- 适合个人私有部署

配置示例：
```env
APP_MODE=private
ADMIN_EMAIL=me@example.com
ADMIN_PASSWORD=my-secret-password
```

## 使用说明

### 导入书源

1. 进入「书源」页面，点击「导入」按钮
2. 选择导入方式：
   - **网络地址** — 输入书源链接，服务端获取并解析（支持 `sourceUrls` 批量格式）
   - **本地文件** — 上传 .json / .txt 书源文件
   - **粘贴导入** — 直接粘贴 Legado 书源 JSON
   - **批量链接** — 输入多个书源链接，每行一个
3. 预览书源列表，查看「新增/更新/相同」状态
4. 勾选需要导入的书源，点击「确认导入」

书源可从社区获取，例如 [legado 书源仓库](https://github.com/topics/legado-source)。

### 导入本地书籍

1. 进入「导入」页面
2. 点击或拖拽上传 TXT/EPUB 文件
3. 系统自动解析章节、封面和元数据
4. 解析成功后跳转到书籍详情页

- TXT：自动检测编码（UTF-8/GBK），按中文章节标题分割
- EPUB：提取封面、目录和正文内容

### 搜索书籍

1. 进入「搜索」页面
2. 可选择特定书源或搜索全部书源
3. 输入书名或作者名
4. 点击搜索结果可查看详情或加入书架

### 阅读书籍

1. 在书籍详情页点击「加入书架」
2. 点击「开始阅读」进入阅读器
3. 点击「目录」查看章节列表
4. 在设置面板调节字号、行距、阅读主题
5. 使用 ← → 键盘快捷键翻页

## 规则引擎

支持 Legado 书源规则语法的子集：

| 规则类型 | 语法 | 示例 |
|----------|------|------|
| CSS 选择器 | `@css:selector` 或默认 | `@css:div.book-list > a` |
| JSONPath | `@json:$.path` 或 `$.path` | `@json:$.data.list` |
| 正则 | `@regex:pattern` | `@regex:<!--content-->(.*?)<!--end-->` |
| 基础 JS | `@js:code` | `@js:result.replace(/a/g,'b')` |
| 链式规则 | `rule1##rule2` | `@css:div.list > li##a@href` |
| 模板变量 | `{{key}}` | `{{key}}`, `{{page}}` |

不支持的功能：完整 XPath、Rhino JS 引擎、Cookie 自动管理、登录流程。

## API

兼容 Legado Web API 的子集：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/bookSources` | GET/POST | 获取/批量保存书源 |
| `/api/bookSources/[url]` | GET/PUT/DELETE | 单个书源 CRUD |
| `/api/bookSources/import` | POST | 导入书源 JSON |
| `/api/bookSources/import/fetch` | POST | 从 URL 获取书源 |
| `/api/bookSources/import/preview` | POST | 导入前预览对比 |
| `/api/bookSources/export` | GET | 导出所有书源 |
| `/api/books` | GET/POST | 书架列表/添加书籍 |
| `/api/books/[url]` | GET/DELETE | 获取/删除书籍 |
| `/api/books/[url]/chapters` | GET | 获取章节列表 |
| `/api/books/[url]/content` | GET | 获取章节内容 |
| `/api/books/[url]/progress` | POST | 保存阅读进度 |
| `/api/search?key=&source=` | GET | 搜索书籍（可选指定书源） |
| `/api/upload` | POST | 上传 TXT/EPUB 文件 |
| `/api/replaceRules` | GET/POST | 替换规则管理 |
| `/api/replaceRules/[id]` | PUT/DELETE | 更新/删除替换规则 |
| `/api/app-mode` | GET | 获取当前运行模式 |

## 项目结构

```
src/
├── app/                    # Next.js App Router 页面和 API
│   ├── page.tsx            # 书架
│   ├── import/             # 本地导入
│   ├── search/             # 搜索
│   ├── sources/            # 书源管理
│   ├── book/[url]/         # 书籍详情
│   ├── read/[url]/         # 阅读器
│   ├── replace-rules/      # 替换净化
│   ├── login/              # 登录
│   ├── register/           # 注册
│   └── api/                # REST API
├── components/             # UI 组件
│   ├── nav-bar.tsx         # 导航栏（Framer Motion 动效）
│   └── page-transition.tsx # 页面过渡组件（预留）
└── lib/
    ├── db/                 # Drizzle ORM Schema + 连接
    ├── rule-engine/        # 规则引擎核心
    ├── txt-parser.ts       # TXT 文件解析
    ├── epub-parser.ts      # EPUB 文件解析
    ├── app-mode.ts         # 运行模式判断
    ├── auth.ts             # NextAuth 认证配置
    ├── types/              # TypeScript 类型
    └── utils/              # 工具函数
```

## 开发

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run lint         # ESLint 检查
npm run db:generate  # 生成数据库迁移
npm run db:push      # 推送 Schema 到数据库
npm run db:studio    # Drizzle Studio 数据库管理
```

## License

GPL-3.0
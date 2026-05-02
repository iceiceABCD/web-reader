# 阅读 Web - Web Reader

基于 [Legado (阅读)](https://github.com/gedoor/legado) 核心功能的 Web 版小说阅读器，支持部署在 Vercel 上。

## 功能

- **书源管理** — 导入/导出 Legado JSON 格式书源，兼容现有书源生态
- **多源搜索** — 并发搜索多个书源，搜索历史记录
- **发现浏览** — 按书源分类浏览推荐内容
- **本地导入** — 直接上传 TXT/EPUB 文件，自动解析章节和封面
- **在线阅读** — 章节目录、上下滚动阅读、字号/行距/主题调节
- **阅读进度** — 自动保存阅读进度，跨设备同步
- **替换净化** — 正则/普通文本替换，去除广告和错别字
- **规则引擎** — CSS 选择器 + JSONPath + 正则 + 基础 JS，链式规则
- **模式切换** — 服务模式多人使用，私人模式单人独享

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 + React 19 + Tailwind CSS |
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

### 4. 本地开发

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 部署到 Vercel

**方式一：CLI 部署**

```bash
npm i -g vercel
vercel
```

**方式二：Dashboard 导入**

在 Vercel Dashboard 中直接导入 GitHub 仓库，自动部署。

部署后需在 Vercel 项目 Settings → Environment Variables 中配置上述环境变量。

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

1. 进入「书源」页面
2. 点击「导入」按钮
3. 粘贴 Legado 书源 JSON（支持数组和单个对象格式）
4. 点击「确认导入」

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
2. 输入书名或作者名
3. 系统将并发搜索所有已启用的书源
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
| `/api/bookSources/export` | GET | 导出所有书源 |
| `/api/books` | GET/POST | 书架列表/添加书籍 |
| `/api/books/[url]` | GET/DELETE | 获取/删除书籍 |
| `/api/books/[url]/chapters` | GET | 获取章节列表 |
| `/api/books/[url]/content` | GET | 获取章节内容 |
| `/api/books/[url]/progress` | POST | 保存阅读进度 |
| `/api/search?key=` | GET | 搜索书籍 |
| `/api/explore` | GET | 获取发现分类/内容 |
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
│   ├── explore/            # 发现
│   ├── sources/            # 书源管理
│   ├── book/[url]/         # 书籍详情
│   ├── read/[url]/         # 阅读器
│   ├── replace-rules/      # 替换净化
│   ├── login/              # 登录
│   ├── register/           # 注册
│   └── api/                # REST API
├── components/             # UI 组件
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
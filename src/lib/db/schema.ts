import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  jsonb,
  serial,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookSources = pgTable(
  "book_sources",
  {
    bookSourceUrl: text("book_source_url").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookSourceName: text("book_source_name").notNull(),
    bookSourceGroup: text("book_source_group"),
    bookSourceType: integer("book_source_type").default(0).notNull(),
    bookUrlPattern: text("book_url_pattern"),
    customOrder: integer("custom_order").default(0).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    enabledExplore: boolean("enabled_explore").default(true).notNull(),
    enabledCookieJar: boolean("enabled_cookie_jar").default(true),
    concurrentRate: text("concurrent_rate"),
    header: text("header"),
    loginUrl: text("login_url"),
    loginUi: text("login_ui"),
    loginCheckJs: text("login_check_js"),
    bookSourceComment: text("book_source_comment"),
    variableComment: text("variable_comment"),
    lastUpdateTime: bigint("last_update_time", { mode: "number" })
      .default(0)
      .notNull(),
    respondTime: bigint("respond_time", { mode: "number" })
      .default(180000)
      .notNull(),
    weight: integer("weight").default(0).notNull(),
    exploreUrl: text("explore_url"),
    searchUrl: text("search_url"),
    ruleSearch: jsonb("rule_search"),
    ruleExplore: jsonb("rule_explore"),
    ruleBookInfo: jsonb("rule_book_info"),
    ruleToc: jsonb("rule_toc"),
    ruleContent: jsonb("rule_content"),
    ruleReview: jsonb("rule_review"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.bookSourceUrl, table.userId] }),
    index("idx_book_sources_user_id").on(table.userId),
  ]
);

export const books = pgTable(
  "books",
  {
    bookUrl: text("book_url").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tocUrl: text("toc_url").default("").notNull(),
    origin: text("origin").default("local").notNull(),
    originName: text("origin_name").default("").notNull(),
    name: text("name").notNull(),
    author: text("author").default("").notNull(),
    kind: text("kind"),
    coverUrl: text("cover_url"),
    intro: text("intro"),
    type: integer("type").default(0).notNull(),
    latestChapterTitle: text("latest_chapter_title"),
    totalChapterNum: integer("total_chapter_num").default(0).notNull(),
    durChapterIndex: integer("dur_chapter_index").default(0).notNull(),
    durChapterPos: integer("dur_chapter_pos").default(0).notNull(),
    durChapterTime: bigint("dur_chapter_time", { mode: "number" })
      .default(0)
      .notNull(),
    wordCount: text("word_count"),
    canUpdate: boolean("can_update").default(true).notNull(),
    order: integer("order").default(0).notNull(),
    variable: text("variable"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.bookUrl, table.userId] }),
    index("idx_books_user_id").on(table.userId),
    index("idx_books_name_author").on(table.name, table.author),
  ]
);

export const chapters = pgTable(
  "chapters",
  {
    url: text("url").notNull(),
    bookUrl: text("book_url").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    index: integer("chapter_index").notNull(),
    isVolume: boolean("is_volume").default(false).notNull(),
    isVip: boolean("is_vip").default(false).notNull(),
    isPay: boolean("is_pay").default(false).notNull(),
    resourceUrl: text("resource_url"),
    variable: text("variable"),
  },
  (table) => [
    primaryKey({ columns: [table.url, table.bookUrl, table.userId] }),
    index("idx_chapters_book_url").on(table.bookUrl, table.userId),
    index("idx_chapters_book_url_index").on(table.bookUrl, table.index, table.userId),
  ]
);

export const replaceRules = pgTable("replace_rules", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  group: text("group_name"),
  pattern: text("pattern").notNull(),
  replacement: text("replacement").default("").notNull(),
  isRegex: boolean("is_regex").default(false).notNull(),
  scope: text("scope"),
  enabled: boolean("enabled").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const readProgress = pgTable(
  "read_progress",
  {
    bookUrl: text("book_url").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    durChapterIndex: integer("dur_chapter_index").default(0).notNull(),
    durChapterPos: integer("dur_chapter_pos").default(0).notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.bookUrl, table.userId] })]
);

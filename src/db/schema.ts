import { pgTable, serial, text, integer, boolean, timestamp, jsonb, index, uniqueIndex, real } from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    salt: text("salt").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_username_idx").on(t.username)]
);

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: integer("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

/* ------------------------------------------------------------------ */
/* My MathBook                                                         */
/* ------------------------------------------------------------------ */
export const books = pgTable(
  "books",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    title: text("title").notNull(),
    subject: text("subject").notNull().default("General"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("books_user_idx").on(t.userId)]
);

export const savedSolutions = pgTable(
  "saved_solutions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    bookId: integer("book_id"),
    section: text("section").notNull().default("Unsorted"),
    unit: text("unit").notNull(),
    topicId: text("topic_id").notNull(),
    operationId: text("operation_id").notNull(),
    questionId: text("question_id"),
    questionNumber: integer("question_number"),
    level: text("level"),
    source: text("source"),
    prompt: text("prompt").notNull(),
    originalPayload: jsonb("original_payload").notNull(),
    finalPayload: jsonb("final_payload").notNull(),
    result: jsonb("result").notNull(),
    notes: text("notes").notNull().default(""),
    bookmarked: boolean("bookmarked").notNull().default(false),
    version: integer("version").notNull().default(1),
    parentVersion: integer("parent_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("saved_user_idx").on(t.userId),
    index("saved_topic_idx").on(t.topicId),
    index("saved_book_idx").on(t.bookId),
  ]
);

export const solutionNotes = pgTable(
  "solution_notes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    solutionId: integer("solution_id").notNull(),
    body: text("body").notNull(),
    stepNumber: integer("step_number"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notes_solution_idx").on(t.solutionId), index("notes_user_idx").on(t.userId)]
);

/* ------------------------------------------------------------------ */
/* Practice and progress                                               */
/* ------------------------------------------------------------------ */
export const attempts = pgTable(
  "attempts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    unit: text("unit").notNull(),
    topicId: text("topic_id").notNull(),
    level: text("level").notNull(),
    questionId: text("question_id").notNull(),
    mode: text("mode").notNull().default("practice"),
    correct: boolean("correct").notNull(),
    timeMs: integer("time_ms").notNull().default(0),
    givenAnswer: text("given_answer").notNull().default(""),
    expectedAnswer: text("expected_answer").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("attempts_user_idx").on(t.userId), index("attempts_topic_idx").on(t.topicId)]
);

export const topicProgress = pgTable(
  "topic_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    unit: text("unit").notNull(),
    topicId: text("topic_id").notNull(),
    visits: integer("visits").notNull().default(0),
    solved: integer("solved").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("progress_user_topic_idx").on(t.userId, t.topicId)]
);

export const recentActivity = pgTable(
  "recent_activity",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    kind: text("kind").notNull(),
    unit: text("unit").notNull().default(""),
    topicId: text("topic_id").notNull().default(""),
    label: text("label").notNull().default(""),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_user_idx").on(t.userId)]
);

export const formulaViews = pgTable(
  "formula_views",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    formulaId: text("formula_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("formula_views_user_idx").on(t.userId)]
);

export const dailyResults = pgTable(
  "daily_results",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    day: text("day").notNull(),
    topicId: text("topic_id").notNull(),
    level: text("level").notNull(),
    correct: boolean("correct").notNull(),
    timeMs: integer("time_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("daily_user_day_idx").on(t.userId, t.day)]
);

export const appMetrics = pgTable("app_metrics", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  value: real("value").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

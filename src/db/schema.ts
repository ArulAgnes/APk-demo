import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  real,
  check,
} from "drizzle-orm/pg-core";

const LEVELS = sql.raw("('beginner', 'intermediate', 'advanced', 'gate', 'challenge')");

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
  (t) => [
    uniqueIndex("users_username_idx").on(t.username),
    check("users_username_check", sql`length(${t.username}) between 3 and 32`),
    check("users_display_name_check", sql`length(${t.displayName}) between 1 and 40`),
    check("users_password_hash_check", sql`length(${t.passwordHash}) > 0`),
    check("users_salt_check", sql`length(${t.salt}) > 0`),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)]
);

/* ------------------------------------------------------------------ */
/* My MathBook                                                         */
/* ------------------------------------------------------------------ */
export const books = pgTable(
  "books",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    subject: text("subject").notNull().default("General"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("books_user_idx").on(t.userId),
    check("books_title_check", sql`length(${t.title}) between 1 and 80`),
  ]
);

export const savedSolutions = pgTable(
  "saved_solutions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: integer("book_id").references(() => books.id, { onDelete: "set null" }),
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
    index("saved_user_updated_idx").on(t.userId, t.updatedAt),
    index("saved_user_book_idx").on(t.userId, t.bookId),
    index("saved_topic_idx").on(t.topicId),
    check("saved_solutions_version_check", sql`${t.version} >= 1`),
    check("saved_solutions_question_number_check", sql`${t.questionNumber} is null or ${t.questionNumber} >= 1`),
    check("saved_solutions_level_check", sql`${t.level} is null or ${t.level} in ${LEVELS}`),
  ]
);

export const solutionNotes = pgTable(
  "solution_notes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    solutionId: integer("solution_id")
      .notNull()
      .references(() => savedSolutions.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    stepNumber: integer("step_number"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notes_solution_idx").on(t.solutionId),
    index("notes_user_idx").on(t.userId),
    check("solution_notes_body_check", sql`length(${t.body}) between 1 and 4000`),
    check("solution_notes_step_number_check", sql`${t.stepNumber} is null or ${t.stepNumber} >= 1`),
  ]
);

/* ------------------------------------------------------------------ */
/* Practice and progress                                               */
/* ------------------------------------------------------------------ */
export const attempts = pgTable(
  "attempts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
  (t) => [
    index("attempts_user_unit_idx").on(t.userId, t.unit),
    index("attempts_user_topic_idx").on(t.userId, t.topicId),
    check("attempts_level_check", sql`${t.level} in ${LEVELS}`),
    check("attempts_time_check", sql`${t.timeMs} between 0 and 3600000`),
  ]
);

export const topicProgress = pgTable(
  "topic_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    unit: text("unit").notNull(),
    topicId: text("topic_id").notNull(),
    visits: integer("visits").notNull().default(0),
    solved: integer("solved").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("progress_user_topic_idx").on(t.userId, t.topicId),
    check(
      "topic_progress_counts_check",
      sql`${t.visits} >= 0 and ${t.solved} >= 0 and ${t.correct} >= 0 and ${t.correct} <= ${t.solved}`
    ),
  ]
);

export const recentActivity = pgTable(
  "recent_activity",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    unit: text("unit").notNull().default(""),
    topicId: text("topic_id").notNull().default(""),
    label: text("label").notNull().default(""),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_user_created_idx").on(t.userId, t.createdAt)]
);

export const formulaViews = pgTable(
  "formula_views",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    formulaId: text("formula_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("formula_views_user_idx").on(t.userId)]
);

export const dailyResults = pgTable(
  "daily_results",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    topicId: text("topic_id").notNull(),
    level: text("level").notNull(),
    correct: boolean("correct").notNull(),
    timeMs: integer("time_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("daily_user_day_idx").on(t.userId, t.day),
    check("daily_results_level_check", sql`${t.level} in ${LEVELS}`),
    check("daily_results_time_check", sql`${t.timeMs} between 0 and 3600000`),
  ]
);

/* ------------------------------------------------------------------ */
/* Offline write ledger                                                */
/* ------------------------------------------------------------------ */
export const syncEvents = pgTable(
  "sync_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientRequestId: text("client_request_id").notNull(),
    operation: text("operation").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sync_events_user_request_idx").on(t.userId, t.clientRequestId),
    index("sync_events_created_idx").on(t.createdAt),
    check("sync_events_request_id_check", sql`length(${t.clientRequestId}) between 8 and 100`),
    check("sync_events_operation_check", sql`length(${t.operation}) between 1 and 80`),
  ]
);

export const appMetrics = pgTable(
  "app_metrics",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    value: real("value").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("app_metrics_key_idx").on(t.key),
    check("app_metrics_key_check", sql`length(${t.key}) > 0`),
  ]
);

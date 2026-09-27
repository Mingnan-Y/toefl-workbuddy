import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const mistakes = sqliteTable("mistakes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  section: text("section").notNull(),
  questionType: text("question_type").notNull().default("未分类"),
  screenshotKey: text("screenshot_key"),
  screenshotName: text("screenshot_name"),
  wrongAnswer: text("wrong_answer").notNull().default(""),
  correctAnswer: text("correct_answer").notNull().default(""),
  answerParts: text("answer_parts").notNull().default("[]"),
  richContent: text("rich_content").notNull().default(""),
  notes: text("notes").notNull().default(""),
  selfReportedWeakness: text("self_reported_weakness").notNull().default(""),
  analysis: text("analysis").notNull().default(""),
  lesson: text("lesson").notNull().default(""),
  status: text("status").notNull().default("pending"),
  dueAt: text("due_at").notNull().default(sql`(datetime('now'))`),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_mistakes_created_at").on(table.createdAt),
  index("idx_mistakes_status_due_at").on(table.status, table.dueAt),
]);

export const vocabulary = sqliteTable("vocabulary", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  word: text("word").notNull(),
  meaning: text("meaning").notNull().default(""),
  contextSentence: text("context_sentence").notNull().default(""),
  collocation: text("collocation").notNull().default(""),
  example: text("example").notNull().default(""),
  level: text("level").notNull().default("passive"),
  sourceMistakeId: integer("source_mistake_id"),
  mastery: integer("mastery").notNull().default(0),
  dueAt: text("due_at").notNull().default(sql`(datetime('now'))`),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_vocabulary_due_at").on(table.dueAt),
]);

export const ideas = sqliteTable("ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topic: text("topic").notNull(),
  claim: text("claim").notNull(),
  example: text("example").notNull().default(""),
  phrases: text("phrases").notNull().default(""),
  richContent: text("rich_content").notNull().default(""),
  notes: text("notes").notNull().default(""),
  section: text("section").notNull().default("both"),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_ideas_created_at").on(table.createdAt),
]);

export type Mistake = typeof mistakes.$inferSelect;
export type Vocabulary = typeof vocabulary.$inferSelect;
export type Idea = typeof ideas.$inferSelect;

export const contentImports = sqliteTable("content_imports", {
  key: text("key").primaryKey(),
});

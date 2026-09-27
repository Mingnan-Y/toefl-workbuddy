CREATE TABLE `ideas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`topic` text NOT NULL,
	`claim` text NOT NULL,
	`example` text DEFAULT '' NOT NULL,
	`phrases` text DEFAULT '' NOT NULL,
	`section` text DEFAULT 'both' NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mistakes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`section` text NOT NULL,
	`question_type` text DEFAULT '未分类' NOT NULL,
	`screenshot_key` text,
	`screenshot_name` text,
	`wrong_answer` text DEFAULT '' NOT NULL,
	`correct_answer` text DEFAULT '' NOT NULL,
	`analysis` text DEFAULT '' NOT NULL,
	`lesson` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`due_at` text DEFAULT (datetime('now')) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vocabulary` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word` text NOT NULL,
	`meaning` text DEFAULT '' NOT NULL,
	`context_sentence` text DEFAULT '' NOT NULL,
	`collocation` text DEFAULT '' NOT NULL,
	`example` text DEFAULT '' NOT NULL,
	`level` text DEFAULT 'passive' NOT NULL,
	`source_mistake_id` integer,
	`mastery` integer DEFAULT 0 NOT NULL,
	`due_at` text DEFAULT (datetime('now')) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);

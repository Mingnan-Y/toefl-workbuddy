CREATE INDEX `idx_ideas_created_at` ON `ideas` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_mistakes_created_at` ON `mistakes` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_mistakes_status_due_at` ON `mistakes` (`status`,`due_at`);--> statement-breakpoint
CREATE INDEX `idx_vocabulary_due_at` ON `vocabulary` (`due_at`);--> statement-breakpoint
PRAGMA optimize;

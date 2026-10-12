ALTER TABLE `results` ADD `task_type` text DEFAULT 'mixed' NOT NULL;--> statement-breakpoint
ALTER TABLE `results` ADD `level` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `results` ADD `questions_total` integer DEFAULT 5 NOT NULL;
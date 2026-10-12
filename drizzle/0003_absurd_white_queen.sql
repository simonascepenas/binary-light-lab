CREATE TABLE `session_students` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`display_name` text NOT NULL,
	`joined_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_session_students_session_name` ON `session_students` (`session_id`,`display_name`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`teacher_token` text NOT NULL,
	`title` text NOT NULL,
	`task_type` text NOT NULL,
	`level` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sessions_code` ON `sessions` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sessions_teacher_token` ON `sessions` (`teacher_token`);--> statement-breakpoint
ALTER TABLE `results` ADD `session_id` integer;--> statement-breakpoint
ALTER TABLE `results` ADD `student_id` integer;--> statement-breakpoint
CREATE INDEX `idx_results_session_student` ON `results` (`session_id`,`student_id`);
CREATE TABLE `results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`display_name` text NOT NULL,
	`class_code` text DEFAULT '' NOT NULL,
	`score` integer NOT NULL,
	`accuracy` integer NOT NULL,
	`duration_seconds` integer NOT NULL,
	`mistakes` integer NOT NULL,
	`completed_at` text NOT NULL
);

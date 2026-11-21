PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_practice_sessions` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`task_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`response` text NOT NULL,
	`time_up_action` text,
	`started_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_practice_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_practice_sessions_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_practice_sessions`(`id`, `user_id`, `task_id`, `name`, `type`, `response`, `time_up_action`, `started_at`, `created_at`, `updated_at`, `deleted_at`) SELECT `id`, `user_id`, `task_id`, `name`, `type`, `response`, `time_up_action`, `started_at`, `created_at`, `updated_at`, `deleted_at` FROM `practice_sessions`;--> statement-breakpoint
DROP TABLE `practice_sessions`;--> statement-breakpoint
ALTER TABLE `__new_practice_sessions` RENAME TO `practice_sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
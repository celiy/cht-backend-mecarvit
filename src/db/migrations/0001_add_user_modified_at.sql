ALTER TABLE `users` ADD `modified_at` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE `users` SET `modified_at` = `created_at`;

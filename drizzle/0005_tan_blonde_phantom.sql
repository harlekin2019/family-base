CREATE TABLE `email_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`chore_id` text NOT NULL,
	`recipient_email` text NOT NULL,
	`kind` text NOT NULL,
	`due_at` integer NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chore_id`) REFERENCES `chores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_email_delivery_once` ON `email_deliveries` (`chore_id`,`recipient_email`,`kind`,`due_at`);
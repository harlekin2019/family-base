CREATE TABLE `email_settings` (
	`family_id` text PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'resend' NOT NULL,
	`sender_name` text DEFAULT 'Family Base' NOT NULL,
	`sender_email` text DEFAULT '' NOT NULL,
	`reply_to` text DEFAULT '' NOT NULL,
	`lead_minutes` integer DEFAULT 1440 NOT NULL,
	`overdue_enabled` integer DEFAULT true NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`last_test_at` integer,
	`last_test_status` text,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action
);

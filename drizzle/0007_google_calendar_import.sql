CREATE TABLE `calendar_feeds` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`name` text NOT NULL,
	`ical_url` text NOT NULL,
	`member_id` text,
	`is_shared` integer DEFAULT false NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_sync_at` integer,
	`last_sync_status` text,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `events` ADD `calendar_feed_id` text;
--> statement-breakpoint
ALTER TABLE `events` ADD `external_uid` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_events_feed_uid` ON `events` (`calendar_feed_id`,`external_uid`);
--> statement-breakpoint
CREATE INDEX `idx_calendar_feeds_family_id` ON `calendar_feeds` (`family_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_calendar_feeds_family_url` ON `calendar_feeds` (`family_id`,`ical_url`);
--> statement-breakpoint
PRAGMA optimize;

ALTER TABLE `recipes` ADD `description` text;
--> statement-breakpoint
ALTER TABLE `recipes` ADD `prep_time` integer;
--> statement-breakpoint
ALTER TABLE `recipes` ADD `cook_time` integer;
--> statement-breakpoint
ALTER TABLE `recipes` ADD `instructions` text DEFAULT '[]' NOT NULL;

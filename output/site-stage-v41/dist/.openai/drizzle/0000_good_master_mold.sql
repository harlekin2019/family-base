CREATE TABLE `chores` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`title` text NOT NULL,
	`assigned_member_id` text,
	`due_at` integer NOT NULL,
	`repeat_rule` text,
	`points` integer DEFAULT 1 NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`title` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`member_id` text,
	`is_shared` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `families` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`email` text,
	`role` text DEFAULT 'member' NOT NULL,
	`color` text DEFAULT '#a3e635' NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_family_user` ON `members` (`family_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`title` text NOT NULL,
	`source_url` text,
	`image_url` text,
	`duration` integer,
	`servings` integer DEFAULT 4 NOT NULL,
	`ingredients` text NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shopping_items` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` text,
	`category` text,
	`checked` integer DEFAULT false NOT NULL,
	`recipe_id` text,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`assigned_member_id` text,
	`due_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);

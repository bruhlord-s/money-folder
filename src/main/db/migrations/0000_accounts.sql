CREATE TABLE `account_tags` (
	`account_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`account_id`, `tag_id`),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_tags_tag_id_idx` ON `account_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`last_four` text,
	`owner_id` integer,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `family_members`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "accounts_last_four_digits" CHECK("accounts"."last_four" GLOB '[0-9][0-9][0-9][0-9]')
);
--> statement-breakpoint
CREATE INDEX `accounts_owner_id_idx` ON `accounts` (`owner_id`);--> statement-breakpoint
CREATE TABLE `family_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `family_members_name_key_unique` ON `family_members` (`name_key`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_key_unique` ON `tags` (`name_key`);
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_key_unique` ON `categories` (`name_key`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`brand` text,
	`brand_key` text DEFAULT '' NOT NULL,
	`size` integer,
	`size_key` integer DEFAULT 0 NOT NULL,
	`unit` text NOT NULL,
	CONSTRAINT "products_size_positive" CHECK("products"."size" > 0),
	CONSTRAINT "products_unit" CHECK("products"."unit" IN ('pcs', 'kg', 'l'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_identity_unique` ON `products` (`name_key`,`brand_key`,`size_key`,`unit`);--> statement-breakpoint
CREATE TABLE `transaction_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transaction_id` integer NOT NULL,
	`product_id` integer,
	`quantity` integer DEFAULT 1000 NOT NULL,
	`amount` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "transaction_lines_quantity_positive" CHECK("transaction_lines"."quantity" > 0),
	CONSTRAINT "transaction_lines_amount_positive" CHECK("transaction_lines"."amount" > 0)
);
--> statement-breakpoint
CREATE INDEX `transaction_lines_transaction_id_idx` ON `transaction_lines` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `transaction_lines_product_id_idx` ON `transaction_lines` (`product_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`occurred_at` integer NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `transactions_account_id_idx` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `transactions_category_id_idx` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `transactions_occurred_at_idx` ON `transactions` (`occurred_at`);
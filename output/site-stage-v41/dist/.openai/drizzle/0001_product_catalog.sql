CREATE TABLE `product_catalog` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `category` text NOT NULL,
  `default_quantity` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_product_catalog_name` ON `product_catalog` (`name`);

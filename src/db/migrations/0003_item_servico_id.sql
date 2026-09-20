PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_item_servico` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quantidade` integer NOT NULL,
	`valor_pecas` real,
	`valor_obra` real NOT NULL,
	`ordem_servico_id` integer NOT NULL,
	`servico_id` integer NOT NULL,
	`mock` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`ordem_servico_id`) REFERENCES `ordem_servico`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`servico_id`) REFERENCES `servico`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_item_servico`("quantidade", "valor_pecas", "valor_obra", "ordem_servico_id", "servico_id", "mock") SELECT "quantidade", "valor_pecas", "valor_obra", "ordem_servico_id", "servico_id", "mock" FROM `item_servico`;--> statement-breakpoint
DROP TABLE `item_servico`;--> statement-breakpoint
ALTER TABLE `__new_item_servico` RENAME TO `item_servico`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
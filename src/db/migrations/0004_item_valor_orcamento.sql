PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_item_servico` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quantidade` integer NOT NULL,
	`valor` real NOT NULL,
	`ordem_servico_id` integer NOT NULL,
	`servico_id` integer NOT NULL,
	`mock` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`ordem_servico_id`) REFERENCES `ordem_servico`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`servico_id`) REFERENCES `servico`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_item_servico`("id", "quantidade", "valor", "ordem_servico_id", "servico_id", "mock") SELECT "id", "quantidade", COALESCE("valor_obra", 0) + COALESCE("valor_pecas", 0), "ordem_servico_id", "servico_id", "mock" FROM `item_servico`;--> statement-breakpoint
DROP TABLE `item_servico`;--> statement-breakpoint
ALTER TABLE `__new_item_servico` RENAME TO `item_servico`;--> statement-breakpoint
INSERT OR IGNORE INTO `status_os` (`id`, `nome`) VALUES (6, 'orçamento');--> statement-breakpoint
PRAGMA foreign_keys=ON;
INSERT OR IGNORE INTO `status_os` (`id`, `nome`) VALUES (7, 'reaberta');--> statement-breakpoint
CREATE TABLE `os_reabertura` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ordem_servico_id` integer NOT NULL,
	`reaberto_em` integer NOT NULL,
	`responsaveis_json` text DEFAULT '[]' NOT NULL,
	`criado_em` integer NOT NULL,
	`modificado_em` integer NOT NULL,
	`mock` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`ordem_servico_id`) REFERENCES `ordem_servico`(`id`) ON UPDATE no action ON DELETE cascade
);
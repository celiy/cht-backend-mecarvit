CREATE TABLE `empresa` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`criado_em` integer NOT NULL,
	`modificado_em` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cargo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`nivel_acesso` text NOT NULL,
	`criado_em` integer NOT NULL,
	`modificado_em` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usuario` (
	`cpf` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`email` text NOT NULL,
	`senha` text NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`senha_inicial` integer DEFAULT false NOT NULL,
	`fundador` integer DEFAULT false NOT NULL,
	`cargo_id` integer NOT NULL,
	`empresa_id` integer NOT NULL,
	`criado_em` integer NOT NULL,
	`modificado_em` integer NOT NULL,
	FOREIGN KEY (`cargo_id`) REFERENCES `cargo`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`empresa_id`) REFERENCES `empresa`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuario_email_unique` ON `usuario` (`email`);
--> statement-breakpoint
CREATE TABLE `status_os` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `status_os_nome_unique` ON `status_os` (`nome`);
--> statement-breakpoint
CREATE TABLE `servico` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`criado_em` integer NOT NULL,
	`modificado_em` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `endereco` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`estado` text NOT NULL,
	`cidade` text NOT NULL,
	`cep` text NOT NULL,
	`bairro` text NOT NULL,
	`rua` text NOT NULL,
	`numero` integer NOT NULL,
	`complemento` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cliente` (
	`documento` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`nome_social` text,
	`cel` text,
	`email` text,
	`obs` text,
	`ativo` integer DEFAULT true NOT NULL,
	`usuario_cpf` text NOT NULL,
	`criado_em` integer NOT NULL,
	`modificado_em` integer NOT NULL,
	FOREIGN KEY (`usuario_cpf`) REFERENCES `usuario`(`cpf`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cliente_email_unique` ON `cliente` (`email`);
--> statement-breakpoint
CREATE TABLE `endereco_cliente` (
	`cliente_documento` text NOT NULL,
	`endereco_id` integer NOT NULL,
	PRIMARY KEY(`cliente_documento`, `endereco_id`),
	FOREIGN KEY (`cliente_documento`) REFERENCES `cliente`(`documento`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`endereco_id`) REFERENCES `endereco`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `veiculo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`modelo` text NOT NULL,
	`placa` text NOT NULL,
	`tipo` text,
	`kilometragem` real,
	`data_troca_oleo` integer,
	`chassi` text,
	`ativo` integer DEFAULT true NOT NULL,
	`cliente_documento` text NOT NULL,
	`criado_em` integer NOT NULL,
	`modificado_em` integer NOT NULL,
	FOREIGN KEY (`cliente_documento`) REFERENCES `cliente`(`documento`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `veiculo_chassi_unique` ON `veiculo` (`chassi`);
--> statement-breakpoint
CREATE TABLE `reg_entrada_saida` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`descricao` text,
	`data_limite_pagamento` integer,
	`tipo` text NOT NULL,
	`valor` real NOT NULL,
	`usuario_cpf` text NOT NULL,
	`criado_em` integer NOT NULL,
	`modificado_em` integer NOT NULL,
	FOREIGN KEY (`usuario_cpf`) REFERENCES `usuario`(`cpf`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ordem_servico` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data_inicio` integer,
	`data_conclusao` integer,
	`diagnostico_cliente` text,
	`diagnostico_mecanico` text,
	`obs` text,
	`veiculo_id` integer NOT NULL,
	`cliente_documento` text NOT NULL,
	`reg_entrada_saida_id` integer,
	`status_os_id` integer NOT NULL,
	`criado_em` integer NOT NULL,
	`modificado_em` integer NOT NULL,
	FOREIGN KEY (`veiculo_id`) REFERENCES `veiculo`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cliente_documento`) REFERENCES `cliente`(`documento`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reg_entrada_saida_id`) REFERENCES `reg_entrada_saida`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`status_os_id`) REFERENCES `status_os`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ordem_servico_reg_entrada_saida_id_unique` ON `ordem_servico` (`reg_entrada_saida_id`);
--> statement-breakpoint
CREATE TABLE `item_servico` (
	`quantidade` integer NOT NULL,
	`valor_pecas` real,
	`valor_obra` real NOT NULL,
	`ordem_servico_id` integer NOT NULL,
	`servico_id` integer NOT NULL,
	PRIMARY KEY(`ordem_servico_id`, `servico_id`),
	FOREIGN KEY (`ordem_servico_id`) REFERENCES `ordem_servico`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`servico_id`) REFERENCES `servico`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `responsavel` (
	`usuario_cpf` text NOT NULL,
	`ordem_servico_id` integer NOT NULL,
	PRIMARY KEY(`usuario_cpf`, `ordem_servico_id`),
	FOREIGN KEY (`usuario_cpf`) REFERENCES `usuario`(`cpf`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ordem_servico_id`) REFERENCES `ordem_servico`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pagamento` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipo` text NOT NULL,
	`valor` real NOT NULL,
	`reg_entrada_saida_id` integer NOT NULL,
	`criado_em` integer NOT NULL,
	`modificado_em` integer NOT NULL,
	FOREIGN KEY (`reg_entrada_saida_id`) REFERENCES `reg_entrada_saida`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `stickerProjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectKey` varchar(64) NOT NULL,
	`title` varchar(160) NOT NULL,
	`brief` text,
	`characterProfile` text,
	`style` varchar(80) NOT NULL,
	`stickerCount` int NOT NULL DEFAULT 10,
	`status` enum('draft','generating','ready','error') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stickerProjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `stickerProjects_projectKey_unique` UNIQUE(`projectKey`)
);
--> statement-breakpoint
CREATE TABLE `stickerReferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`url` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stickerReferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stickerScripts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`position` int NOT NULL,
	`emotion` varchar(80) NOT NULL,
	`phrase` varchar(160) NOT NULL,
	`scene` text,
	`status` enum('draft','queued','generating','ready','error') NOT NULL DEFAULT 'draft',
	`resultUrl` text,
	`qualityReport` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stickerScripts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stickerVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scriptId` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`url` text NOT NULL,
	`mode` varchar(40) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stickerVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

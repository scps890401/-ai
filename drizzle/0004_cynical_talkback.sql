CREATE TABLE `character_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`visualBibleJson` text NOT NULL,
	`referenceAssetIdsJson` text NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `character_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`kind` enum('source','reference','generated','export') NOT NULL,
	`position` int,
	`storageKey` varchar(512) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`width` int,
	`height` int,
	`fileSize` int,
	`sha256` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_checkpoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`reason` varchar(80) NOT NULL,
	`snapshotJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_checkpoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_exports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`type` enum('png','zip') NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`status` enum('processing','ready','failed') NOT NULL DEFAULT 'processing',
	`validationJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_exports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`attachmentAssetIdsJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sticker_job_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`assetId` int NOT NULL,
	`editPrompt` text,
	`changeSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sticker_job_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sticker_job_versions_job_version_unique` UNIQUE(`jobId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `sticker_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`planItemId` int,
	`position` int NOT NULL,
	`status` enum('pending','generating','completed','failed','retrying') NOT NULL DEFAULT 'pending',
	`attemptCount` int NOT NULL DEFAULT 0,
	`provider` varchar(80),
	`errorCode` varchar(80),
	`errorMessage` text,
	`currentAssetId` int,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sticker_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `sticker_jobs_project_position_unique` UNIQUE(`projectId`,`position`)
);
--> statement-breakpoint
CREATE TABLE `sticker_plan_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`position` int NOT NULL,
	`text` varchar(160) NOT NULL,
	`action` varchar(255) NOT NULL,
	`emotion` varchar(120),
	`composition` text,
	`prompt` text,
	`targetStickerId` int,
	CONSTRAINT `sticker_plan_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `sticker_plan_items_plan_position_unique` UNIQUE(`planId`,`position`)
);
--> statement-breakpoint
CREATE TABLE `sticker_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`brief` text NOT NULL,
	`language` varchar(32) NOT NULL DEFAULT 'zh-Hant',
	`style` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sticker_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sticker_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int,
	`guestKey` varchar(128),
	`name` varchar(120) NOT NULL,
	`status` enum('draft','generating','paused','completed') NOT NULL DEFAULT 'draft',
	`packSize` int NOT NULL DEFAULT 8,
	`stateJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastOpenedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sticker_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `character_profiles_project_version_idx` ON `character_profiles` (`projectId`,`version`);--> statement-breakpoint
CREATE INDEX `project_assets_project_kind_idx` ON `project_assets` (`projectId`,`kind`);--> statement-breakpoint
CREATE INDEX `project_checkpoints_project_created_idx` ON `project_checkpoints` (`projectId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `project_conversations_project_updated_idx` ON `project_conversations` (`projectId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `project_exports_project_created_idx` ON `project_exports` (`projectId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `project_messages_conversation_created_idx` ON `project_messages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `sticker_jobs_project_status_idx` ON `sticker_jobs` (`projectId`,`status`);--> statement-breakpoint
CREATE INDEX `sticker_plans_project_version_idx` ON `sticker_plans` (`projectId`,`version`);--> statement-breakpoint
CREATE INDEX `sticker_projects_owner_updated_idx` ON `sticker_projects` (`ownerUserId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `sticker_projects_guest_updated_idx` ON `sticker_projects` (`guestKey`,`updatedAt`);
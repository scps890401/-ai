CREATE TABLE `stickerAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`messageId` int NOT NULL,
	`fileKey` text NOT NULL,
	`url` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stickerAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stickerCharacterProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`profileJson` text NOT NULL,
	`anchorUrl` text,
	`status` varchar(40) NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stickerCharacterProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stickerConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`status` varchar(40) NOT NULL DEFAULT 'active',
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stickerConversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stickerExports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`kind` varchar(64) NOT NULL,
	`url` text NOT NULL,
	`qualityReportJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stickerExports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stickerJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`scriptId` int,
	`kind` varchar(64) NOT NULL,
	`status` varchar(40) NOT NULL DEFAULT 'queued',
	`attempt` int NOT NULL DEFAULT 0,
	`provider` varchar(64),
	`errorCode` varchar(120),
	`errorMessage` text,
	`checkpointJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stickerJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stickerMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`intentJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stickerMessages_id` PRIMARY KEY(`id`)
);

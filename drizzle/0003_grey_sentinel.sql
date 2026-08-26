CREATE TABLE `stickerAgentEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`jobId` int,
	`kind` varchar(64) NOT NULL,
	`status` varchar(40) NOT NULL DEFAULT 'queued',
	`message` text NOT NULL,
	`detailJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stickerAgentEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stickerStyleAnchors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`summaryJson` text NOT NULL,
	`anchorUrl` text,
	`status` varchar(40) NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stickerStyleAnchors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `stickerJobs` ADD `routerJson` text;--> statement-breakpoint
ALTER TABLE `stickerJobs` ADD `qualityReportJson` text;--> statement-breakpoint
ALTER TABLE `stickerReferences` ADD `role` varchar(40) DEFAULT 'character' NOT NULL;--> statement-breakpoint
ALTER TABLE `stickerReferences` ADD `priority` int DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `stickerReferences` ADD `accepted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `stickerReferences` ADD `metadataJson` text;--> statement-breakpoint
ALTER TABLE `stickerScripts` ADD `planJson` text;--> statement-breakpoint
ALTER TABLE `stickerVersions` ADD `parentVersionId` int;--> statement-breakpoint
ALTER TABLE `stickerVersions` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `stickerVersions` ADD `qualityReportJson` text;--> statement-breakpoint
ALTER TABLE `stickerVersions` ADD `provider` varchar(64);
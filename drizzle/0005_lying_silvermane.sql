ALTER TABLE `sticker_job_versions` ADD `metadataJson` text;--> statement-breakpoint
ALTER TABLE `sticker_jobs` ADD `model` varchar(120);--> statement-breakpoint
ALTER TABLE `sticker_jobs` ADD `routingJson` text;--> statement-breakpoint
ALTER TABLE `sticker_jobs` ADD `qualityJson` text;
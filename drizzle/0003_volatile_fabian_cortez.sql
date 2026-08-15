CREATE TABLE `feedback_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`feedbackId` int NOT NULL,
	`voterKey` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_votes_id` PRIMARY KEY(`id`),
	CONSTRAINT `feedback_votes_feedback_voter_unique` UNIQUE(`feedbackId`,`voterKey`)
);
--> statement-breakpoint
ALTER TABLE `feedback` ADD `upvotes` int DEFAULT 0 NOT NULL;
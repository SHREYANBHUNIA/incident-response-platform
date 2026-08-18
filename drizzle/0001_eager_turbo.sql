CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` varchar(128) NOT NULL,
	`severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'warning',
	`message` text NOT NULL,
	`metadata` json NOT NULL,
	`fingerprint` varchar(128) NOT NULL,
	`status` enum('open','acknowledged','resolved','suppressed') NOT NULL DEFAULT 'open',
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('alert','cluster','incident','configuration') NOT NULL,
	`entityId` int NOT NULL,
	`action` varchar(64) NOT NULL,
	`actor` varchar(255) NOT NULL,
	`details` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clusterAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clusterId` int NOT NULL,
	`alertId` int NOT NULL,
	`similarity` varchar(16) NOT NULL DEFAULT '1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clusterAlerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clusters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` text,
	`severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'warning',
	`status` enum('active','acknowledged','resolved','suppressed') NOT NULL DEFAULT 'active',
	`alertCount` int NOT NULL DEFAULT 0,
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clusters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text,
	`updatedBy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `configurations_id` PRIMARY KEY(`id`),
	CONSTRAINT `configurations_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clusterId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'warning',
	`status` enum('investigating','acknowledged','resolved','suppressed') NOT NULL DEFAULT 'investigating',
	`rootCause` text,
	`explanation` text,
	`suggestedFixes` json NOT NULL,
	`timeline` json NOT NULL,
	`confidence` int NOT NULL DEFAULT 0,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`acknowledgedAt` timestamp,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incidents_id` PRIMARY KEY(`id`)
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
--> statement-breakpoint
ALTER TABLE `clusterAlerts` ADD CONSTRAINT `clusterAlerts_clusterId_clusters_id_fk` FOREIGN KEY (`clusterId`) REFERENCES `clusters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clusterAlerts` ADD CONSTRAINT `clusterAlerts_alertId_alerts_id_fk` FOREIGN KEY (`alertId`) REFERENCES `alerts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_clusterId_clusters_id_fk` FOREIGN KEY (`clusterId`) REFERENCES `clusters`(`id`) ON DELETE no action ON UPDATE no action;
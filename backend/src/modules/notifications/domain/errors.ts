import { AppError } from "../../../shared/errors/app-error.js";

export class NotificationsRepositoryFailureError extends AppError {
    readonly code = "NOTIFICATIONS_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`notifications repository operation failed: ${operation}`, { cause });
    }
}

export class NotificationNotFoundError extends AppError {
    readonly code = "NOTIFICATION_NOT_FOUND";
    readonly statusCode = 404;

    constructor(public readonly notificationId: string) {
        super(`notification not found: "${notificationId}"`);
    }
}

export class AnnouncementNotFoundError extends AppError {
    readonly code = "ANNOUNCEMENT_NOT_FOUND";
    readonly statusCode = 404;

    constructor(public readonly announcementId: string) {
        super(`announcement not found: "${announcementId}"`);
    }
}

export const ANNOUNCEMENT_TARGET_KINDS = ["package", "schedule", "customer"] as const;

export type AnnouncementTargetKind = (typeof ANNOUNCEMENT_TARGET_KINDS)[number];

export class AnnouncementTargetNotFoundError extends AppError {
    readonly code = "TARGET_NOT_FOUND";
    readonly statusCode = 404;

    constructor(
        public readonly kind: AnnouncementTargetKind,
        public readonly targetId: string,
        options?: { cause?: unknown },
    ) {
        super(`${kind} not found: "${targetId}"`, options);
    }
}

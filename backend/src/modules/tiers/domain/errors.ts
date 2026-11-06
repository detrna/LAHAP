import { AppError } from "../../../shared/errors/app-error.js";

export class TiersRepositoryFailureError extends AppError {
    readonly code = "TIERS_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`tiers repository operation failed: ${operation}`, { cause });
    }
}

export class TierNotFoundError extends AppError {
    readonly code = "TIER_NOT_FOUND";
    readonly statusCode = 404;

    constructor(public readonly tierId: string) {
        super(`tier not found: "${tierId}"`);
    }
}

export const TIER_UNIQUE_FIELDS = ["name", "requiredSubscriptionDays"] as const;

export type TierUniqueField = (typeof TIER_UNIQUE_FIELDS)[number];

const TIER_UNIQUE_MESSAGES: Record<TierUniqueField, string> = {
    name: "tier name is already used",
    requiredSubscriptionDays: "required subscription days is already used by another tier",
};

export class TierAlreadyExistsError extends AppError {
    readonly code = "CONFLICT";
    readonly statusCode = 409;

    constructor(
        public readonly field: TierUniqueField,
        options?: { cause?: unknown },
    ) {
        super(TIER_UNIQUE_MESSAGES[field], options);
    }
}

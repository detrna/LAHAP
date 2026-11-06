import { AppError } from "../../../shared/errors/app-error.js";

export class CatalogRepositoryFailureError extends AppError {
    readonly code = "CATALOG_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`catalog repository operation failed: ${operation}`, { cause });
    }
}

export class AllergyNotFoundError extends AppError {
    readonly code = "ALLERGY_NOT_FOUND";
    readonly statusCode = 404;

    constructor(public readonly allergyId: string) {
        super(`allergy not found: "${allergyId}"`);
    }
}

export class AllergyAlreadyExistsError extends AppError {
    readonly code = "CONFLICT";
    readonly statusCode = 409;

    constructor(
        public readonly name: string,
        options?: { cause?: unknown },
    ) {
        super(`allergy already exists: "${name}"`, options);
    }
}

export class PackageNotFoundError extends AppError {
    readonly code = "PACKAGE_NOT_FOUND";
    readonly statusCode = 404;

    constructor(public readonly packageId: string) {
        super(`package not found: "${packageId}"`);
    }
}

export class PackageInUseError extends AppError {
    readonly code = "CONFLICT";
    readonly statusCode = 409;

    constructor(
        public readonly packageId: string,
        options?: { cause?: unknown },
    ) {
        super("package is used by subscriptions, deactivate it instead", options);
    }
}

export class MenuNotFoundError extends AppError {
    readonly code = "MENU_NOT_FOUND";
    readonly statusCode = 404;

    constructor(public readonly menuId: string) {
        super(`menu not found: "${menuId}"`);
    }
}

export class MenuInUseError extends AppError {
    readonly code = "CONFLICT";
    readonly statusCode = 409;

    constructor(
        public readonly menuId: string,
        options?: { cause?: unknown },
    ) {
        super("menu is used by schedules", options);
    }
}

export class UnknownIngredientError extends AppError {
    readonly code = "UNKNOWN_INGREDIENT";
    readonly statusCode = 400;

    constructor(public readonly ingredientIds: readonly string[]) {
        super(`unknown ingredient ids: ${ingredientIds.join(", ")}`);
    }
}

export class UnknownMenuError extends AppError {
    readonly code = "UNKNOWN_MENU";
    readonly statusCode = 400;

    constructor(public readonly menuIds: readonly string[]) {
        super(`unknown menu ids: ${menuIds.join(", ")}`);
    }
}

export class MenuScheduleNotFoundError extends AppError {
    readonly code = "MENU_SCHEDULE_NOT_FOUND";
    readonly statusCode = 404;

    constructor(public readonly scheduleId: string) {
        super(`menu schedule not found: "${scheduleId}"`);
    }
}

export class ScheduleAlreadyExistsError extends AppError {
    readonly code = "CONFLICT";
    readonly statusCode = 409;

    constructor(options?: { cause?: unknown }) {
        super("a schedule already exists for this package, date and meal time", options);
    }
}

export class ScheduleInUseError extends AppError {
    readonly code = "CONFLICT";
    readonly statusCode = 409;

    constructor(options?: { cause?: unknown }) {
        super("schedule has active orders", options);
    }
}

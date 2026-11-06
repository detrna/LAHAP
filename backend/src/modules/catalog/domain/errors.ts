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

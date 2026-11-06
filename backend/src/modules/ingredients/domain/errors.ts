import { AppError } from "../../../shared/errors/app-error.js";

export class IngredientsRepositoryFailureError extends AppError {
    readonly code = "INGREDIENTS_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`ingredients repository operation failed: ${operation}`, { cause });
    }
}

export class IngredientNotFoundError extends AppError {
    readonly code = "INGREDIENT_NOT_FOUND";
    readonly statusCode = 404;

    constructor(public readonly ingredientId: string) {
        super(`ingredient not found: "${ingredientId}"`);
    }
}

export class IngredientAlreadyExistsError extends AppError {
    readonly code = "CONFLICT";
    readonly statusCode = 409;

    constructor(
        public readonly name: string,
        options?: { cause?: unknown },
    ) {
        super(`ingredient already exists: "${name}"`, options);
    }
}

export class IngredientInUseError extends AppError {
    readonly code = "CONFLICT";
    readonly statusCode = 409;

    constructor(options: { menuNames?: readonly string[]; cause?: unknown } = {}) {
        const { menuNames = [], cause } = options;
        super(
            menuNames.length > 0
                ? `ingredient is used by menus: ${menuNames.join(", ")}`
                : "ingredient is used by menus, remove it from them first",
            { cause },
        );
    }
}

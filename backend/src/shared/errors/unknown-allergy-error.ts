import { AppError } from "./app-error.js";

export class UnknownAllergyError extends AppError {
    readonly code = "UNKNOWN_ALLERGY";
    readonly statusCode = 400;

    constructor(public readonly allergyIds: readonly string[]) {
        super(`unknown allergy ids: ${allergyIds.join(", ")}`);
    }
}

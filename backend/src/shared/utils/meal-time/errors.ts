import { AppError } from "../../errors/app-error.js";

export class InvalidMealTimeError extends AppError {
    readonly code = "INVALID_MEAL_TIME";
    readonly statusCode = 400;

    constructor(public readonly value: unknown) {
        super(`invalid meal time: ${JSON.stringify(value)} (expected "HH:mm")`);
    }
}

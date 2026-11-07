import { AppError } from "./app-error.js";

export class UserNotFoundError extends AppError {
    readonly code = "USER_NOT_FOUND";
    readonly statusCode = 404;

    constructor(public readonly userId: string) {
        super(`user not found: "${userId}"`);
    }
}

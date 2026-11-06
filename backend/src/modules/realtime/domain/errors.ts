import { AppError } from "../../../shared/errors/app-error.js";

export class RealtimeCapacityError extends AppError {
    readonly code = "SERVICE_UNAVAILABLE";
    readonly statusCode = 503;

    constructor() {
        super("too many open event streams, try again later");
    }
}

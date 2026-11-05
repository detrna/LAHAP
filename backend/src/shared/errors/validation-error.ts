import type { ValidationIssue } from "../response/error-response.js";
import { AppError } from "./app-error.js";

export class ValidationError extends AppError {
    readonly code = "VALIDATION_ERROR";
    readonly statusCode = 400;

    constructor(
        public readonly issues: readonly ValidationIssue[],
        options?: { cause?: unknown },
    ) {
        const summary = issues
            .map(issue => {
                const location = issue.path ? `${issue.target}.${issue.path}` : issue.target;
                return `${location}: ${issue.message}`;
            })
            .join("; ");

        super(summary ? `request validation failed: ${summary}` : "request validation failed", options);
    }
}

import { describe, expect, it } from "vitest";
import {
    createErrorResponse,
    type ErrorResponseBody,
    type ValidationIssue,
} from "./error-response.js";

describe("error-response", () => {
    it("creates an ErrorResponseBody without issues when issues are omitted", () => {
        const response: ErrorResponseBody = createErrorResponse(
            "NOT_FOUND",
            "Resource not found",
        );

        expect(response).toEqual({
            error: {
                code: "NOT_FOUND",
                message: "Resource not found",
            },
        });
        expect(response.error.issues).toBeUndefined();
    });

    it("creates an ErrorResponseBody without issues when issues array is empty", () => {
        const response: ErrorResponseBody = createErrorResponse(
            "BAD_REQUEST",
            "Bad request",
            [],
        );

        expect(response).toEqual({
            error: {
                code: "BAD_REQUEST",
                message: "Bad request",
            },
        });
        expect(response.error.issues).toBeUndefined();
    });

    it("creates an ErrorResponseBody with issues when issues are provided", () => {
        const issues: ValidationIssue[] = [
            {
                target: "body",
                path: "email",
                message: "Invalid email",
                code: "invalid_string",
            },
        ];

        const response: ErrorResponseBody = createErrorResponse(
            "VALIDATION_ERROR",
            "Validation failed",
            issues,
        );

        expect(response).toEqual({
            error: {
                code: "VALIDATION_ERROR",
                message: "Validation failed",
                issues,
            },
        });
    });
});


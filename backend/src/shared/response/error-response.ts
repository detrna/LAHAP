export type RequestValidationTarget = "body" | "query" | "params";

export interface ValidationIssue {
    readonly target: RequestValidationTarget | string;
    readonly path: string;
    readonly message: string;
    readonly code: string;
}

export interface ErrorResponseBody {
    readonly error: {
        readonly code: string;
        readonly message: string;
        readonly issues?: readonly ValidationIssue[] | undefined;
    };
}

export function createErrorResponse(
    code: string,
    message: string,
    issues?: readonly ValidationIssue[],
): ErrorResponseBody {
    return {
        error: {
            code,
            message,
            ...(issues && issues.length > 0 ? { issues } : {}),
        },
    };
}


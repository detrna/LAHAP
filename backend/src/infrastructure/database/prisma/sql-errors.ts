const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const MAX_CAUSE_DEPTH = 5;

export interface SqlError {
    readonly sqlState?: unknown;
    readonly code?: unknown;
    readonly constraint?: unknown;
    readonly cause?: unknown;
}

export function findSqlError(error: unknown, sqlState: string): SqlError | null {
    let current: unknown = error;
    for (let depth = 0; depth < MAX_CAUSE_DEPTH && typeof current === "object" && current !== null; depth++) {
        const candidate = current as SqlError;
        if ((candidate.sqlState ?? candidate.code) === sqlState) {
            return candidate;
        }
        current = candidate.cause;
    }
    return null;
}

function getViolatedConstraint(error: unknown, sqlState: string): string | null {
    const constraint = findSqlError(error, sqlState)?.constraint;
    return typeof constraint === "string" ? constraint : null;
}

export function getUniqueViolationConstraint(error: unknown): string | null {
    return getViolatedConstraint(error, UNIQUE_VIOLATION);
}

export function getForeignKeyViolationConstraint(error: unknown): string | null {
    return getViolatedConstraint(error, FOREIGN_KEY_VIOLATION);
}

const UNIQUE_VIOLATION = "23505";
const MAX_CAUSE_DEPTH = 5;

export function getUniqueViolationConstraint(error: unknown): string | null {
    let current: unknown = error;
    for (let depth = 0; depth < MAX_CAUSE_DEPTH && typeof current === "object" && current !== null; depth++) {
        const candidate = current as { sqlState?: unknown; code?: unknown; constraint?: unknown; cause?: unknown };
        const state = candidate.sqlState ?? candidate.code;
        if (state === UNIQUE_VIOLATION && typeof candidate.constraint === "string") {
            return candidate.constraint;
        }
        current = candidate.cause;
    }
    return null;
}

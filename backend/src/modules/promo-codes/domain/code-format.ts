export const CODE_PATTERN = /^[A-Z0-9_-]{1,50}$/;

export function normalizeCode(input: string): string {
    return input.trim().toUpperCase();
}

export function isValidCode(code: string): boolean {
    return CODE_PATTERN.test(code);
}

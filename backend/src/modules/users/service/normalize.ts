export function blankToNull(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

export function normalizeEmail(value: string | null | undefined): string | null {
    return blankToNull(value)?.toLowerCase() ?? null;
}

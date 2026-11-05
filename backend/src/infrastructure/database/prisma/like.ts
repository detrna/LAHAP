export function escapeLikePattern(term: string): string {
    return term.replace(/[\\%_]/g, character => `\\${character}`);
}

export function toContainsPattern(term: string): string {
    return `%${escapeLikePattern(term)}%`;
}

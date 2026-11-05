const SEPARATORS = /[\s\-.()]/g;
const LOCAL_PREFIX = /^(\+62|0)(\d+)$/;

export function toPhoneSearch(search: string): string | undefined {
    const match = LOCAL_PREFIX.exec(search.replace(SEPARATORS, ""));
    return match === null ? undefined : `62${match[2]}`;
}

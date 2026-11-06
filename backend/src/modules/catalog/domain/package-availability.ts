export interface PackageSalesWindow {
    readonly isActive: boolean;
    readonly startAt: Temporal.PlainDateTime;
    readonly endAt: Temporal.PlainDateTime | null;
}

export function isPackageAvailable(window: PackageSalesWindow, now: Temporal.PlainDateTime): boolean {
    if (!window.isActive) return false;
    if (Temporal.PlainDateTime.compare(window.startAt, now) > 0) return false;
    return window.endAt === null || Temporal.PlainDateTime.compare(now, window.endAt) < 0;
}

export function isValidSalesWindow(startAt: Temporal.PlainDateTime, endAt: Temporal.PlainDateTime | null): boolean {
    return endAt === null || Temporal.PlainDateTime.compare(endAt, startAt) > 0;
}

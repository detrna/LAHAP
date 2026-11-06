import type { ValidationIssue } from "../../../../shared/response/error-response.js";
import { isSameClockTime } from "../../../../shared/utils/meal-time/meal-time.js";
import type { MenuKindRecord, PackageRecord } from "../interfaces/catalog.repository.js";
import { UnknownMenuError } from "../interfaces/catalog.repository.js";
import type { CatalogRepository } from "../interfaces/catalog.repository.js";

export type IssuePath = (field: string) => string;

export const issue = (path: string, message: string, code: string): ValidationIssue => ({
    target: "body",
    path,
    message,
    code,
});

export function dateIssue(date: Temporal.PlainDate, today: Temporal.PlainDate, path: IssuePath): ValidationIssue[] {
    return Temporal.PlainDate.compare(date, today) < 0
        ? [issue(path("date"), "must be today or later", "date_in_past")]
        : [];
}

export function deliveryTimeIssue(
    deliveryTime: Temporal.PlainTime,
    pkg: PackageRecord,
    path: IssuePath,
): ValidationIssue[] {
    return pkg.deliveryTimes.some(time => isSameClockTime(time, deliveryTime))
        ? []
        : [issue(path("deliveryTime"), "must be one of the package's meal times", "unknown_delivery_time")];
}

export function alternativeIssues(
    primaryMenuId: string | null,
    alternativeMenuId: string | null,
    kinds: ReadonlyMap<string, boolean>,
    path: IssuePath,
): ValidationIssue[] {
    if (alternativeMenuId === null) return [];
    if (alternativeMenuId === primaryMenuId) {
        return [issue(path("alternativeMenuId"), "must differ from the primary menu", "same_as_primary")];
    }
    if (kinds.get(alternativeMenuId) === false) {
        return [issue(path("alternativeMenuId"), "must be an alternative menu", "not_alternative")];
    }
    return [];
}

export async function loadMenuKinds(
    repository: CatalogRepository,
    menuIds: readonly (string | null | undefined)[],
): Promise<ReadonlyMap<string, boolean>> {
    const ids = [...new Set(menuIds.filter((id): id is string => typeof id === "string"))];
    if (ids.length === 0) return new Map();
    const kinds: readonly MenuKindRecord[] = await repository.findMenuKinds(ids);
    const byId = new Map(kinds.map(kind => [kind.id, kind.isAlternative]));
    const missing = ids.filter(id => !byId.has(id));
    if (missing.length > 0) throw new UnknownMenuError(missing);
    return byId;
}

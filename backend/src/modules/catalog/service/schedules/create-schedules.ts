import { ValidationError } from "../../../../shared/errors/validation-error.js";
import type { ValidationIssue } from "../../../../shared/response/error-response.js";
import type { MenuSchedule } from "../../domain/schedule.domain.js";
import type { CatalogService } from "../catalog.service.js";
import type { PackageRecord } from "../interfaces/catalog.repository.js";
import { alternativeIssues, dateIssue, deliveryTimeIssue, issue, loadMenuKinds } from "./schedule-issues.js";

export interface CreateScheduleInput {
    readonly packageId: string;
    readonly date: Temporal.PlainDate;
    readonly deliveryTime: Temporal.PlainTime;
    readonly primaryMenuId: string;
    readonly alternativeMenuId?: string | null | undefined;
    readonly isPublished?: boolean | undefined;
}

export async function createSchedules(
    this: CatalogService,
    items: readonly CreateScheduleInput[],
): Promise<readonly MenuSchedule[]> {
    const today = this.clock.now().toPlainDate();
    const packages = await this.catalogRepository.findPackagesByIds([...new Set(items.map(item => item.packageId))]);
    const packageById = new Map<string, PackageRecord>(packages.map(pkg => [pkg.id, pkg]));
    const kinds = await loadMenuKinds(
        this.catalogRepository,
        items.flatMap(item => [item.primaryMenuId, item.alternativeMenuId]),
    );

    const issues: ValidationIssue[] = items.flatMap((item, index) => {
        const path = (field: string) => `items.${index}.${field}`;
        const pkg = packageById.get(item.packageId);
        return [
            ...(pkg === undefined
                ? [issue(path("packageId"), "package not found", "package_not_found")]
                : deliveryTimeIssue(item.deliveryTime, pkg, path)),
            ...dateIssue(item.date, today, path),
            ...alternativeIssues(item.primaryMenuId, item.alternativeMenuId ?? null, kinds, path),
        ];
    });
    if (issues.length > 0) throw new ValidationError(issues);

    const records = await this.catalogRepository.createSchedules(
        items.map(item => ({
            packageId: item.packageId,
            date: item.date,
            deliveryTime: item.deliveryTime,
            primaryMenuId: item.primaryMenuId,
            alternativeMenuId: item.alternativeMenuId ?? null,
            isPublished: item.isPublished ?? false,
        })),
    );
    return this.presentSchedules(records, "staff");
}

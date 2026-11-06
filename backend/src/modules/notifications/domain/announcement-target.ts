import type { ValidationIssue } from "../../../shared/response/error-response.js";
import type { AnnouncementScope } from "./announcement.domain.js";

export interface AnnouncementTarget {
    readonly scope: AnnouncementScope;
    readonly packageId: string | null;
    readonly menuScheduleId: string | null;
}

const REQUIRED_FIELD: Record<AnnouncementScope, keyof Omit<AnnouncementTarget, "scope"> | null> = {
    GLOBAL: null,
    PACKAGE: "packageId",
    SCHEDULE: "menuScheduleId",
};

const TARGET_FIELDS = ["packageId", "menuScheduleId"] as const;

export function findAnnouncementTargetIssues(target: AnnouncementTarget): ValidationIssue[] {
    const required = REQUIRED_FIELD[target.scope];
    const issues: ValidationIssue[] = [];

    for (const field of TARGET_FIELDS) {
        const value = target[field];
        if (field === required && value === null) {
            issues.push({
                target: "body",
                path: field,
                message: `is required when scope is ${target.scope}`,
                code: "invalid_target",
            });
        } else if (field !== required && value !== null) {
            issues.push({
                target: "body",
                path: field,
                message: `must be null when scope is ${target.scope}`,
                code: "invalid_target",
            });
        }
    }

    return issues;
}

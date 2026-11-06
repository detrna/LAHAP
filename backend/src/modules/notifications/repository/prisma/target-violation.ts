import { getForeignKeyViolationConstraint } from "../../../../infrastructure/database/prisma/sql-errors.js";
import { AnnouncementTargetNotFoundError } from "../../service/interfaces/notifications.repository.js";

export interface AnnouncementTargetIds {
    readonly packageId?: string | null | undefined;
    readonly menuScheduleId?: string | null | undefined;
}

export function toTargetNotFoundError(
    cause: unknown,
    ids: AnnouncementTargetIds,
): AnnouncementTargetNotFoundError | null {
    const constraint = getForeignKeyViolationConstraint(cause);
    if (constraint === "announcement_package_id_fkey" && typeof ids.packageId === "string") {
        return new AnnouncementTargetNotFoundError("package", ids.packageId, { cause });
    }
    if (constraint === "announcement_menu_schedule_id_fkey" && typeof ids.menuScheduleId === "string") {
        return new AnnouncementTargetNotFoundError("schedule", ids.menuScheduleId, { cause });
    }
    return null;
}

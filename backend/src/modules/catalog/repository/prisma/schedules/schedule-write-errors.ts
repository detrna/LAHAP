import {
    getForeignKeyViolationConstraint,
    getUniqueViolationConstraint,
} from "../../../../../infrastructure/database/prisma/sql-errors.js";
import type { AppError } from "../../../../../shared/errors/app-error.js";
import { ScheduleAlreadyExistsError, UnknownMenuError } from "../../../service/interfaces/catalog.repository.js";

export function toScheduleWriteError(cause: unknown, menuIds: readonly (string | null)[]): AppError | null {
    if (getUniqueViolationConstraint(cause) === "schedule_package_id_date_delivery_time_key") {
        return new ScheduleAlreadyExistsError({ cause });
    }
    if (getForeignKeyViolationConstraint(cause) === "schedule_menu_menu_id_fkey") {
        return new UnknownMenuError(menuIds.filter((id): id is string => id !== null));
    }
    return null;
}

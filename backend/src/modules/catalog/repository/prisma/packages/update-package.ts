import { InvalidStateError } from "../../../../../shared/errors/invalid-state-error.js";
import {
    getForeignKeyViolationConstraint,
    getUniqueViolationConstraint,
} from "../../../../../infrastructure/database/prisma/sql-errors.js";
import { toNumeric, toNumericOrNull } from "../../../../../infrastructure/database/prisma/numeric.js";
import { MEAL_TIME_IN_USE_MESSAGE } from "../../../domain/meal-times.js";
import type {
    PackageChanges,
    PackageRecord,
    UpdatePackageOptions,
} from "../../../service/interfaces/catalog.repository.js";
import {
    CatalogRepositoryFailureError,
    ScheduleAlreadyExistsError,
} from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { toPackageRecord } from "./to-package-record.js";

function toPackageColumns(changes: PackageChanges) {
    return {
        ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(changes.description !== undefined ? { description: changes.description } : {}),
        ...(changes.basePrice !== undefined ? { basePrice: toNumeric(changes.basePrice, 2) } : {}),
        ...(changes.periods !== undefined ? { periods: [...changes.periods] } : {}),
        ...(changes.deliveryTimes !== undefined ? { deliveryTimes: [...changes.deliveryTimes] } : {}),
        ...(changes.deliveryFreeRadius !== undefined
            ? { deliveryFreeRadius: toNumericOrNull(changes.deliveryFreeRadius, 2) }
            : {}),
        ...(changes.deliveryMaxDistance !== undefined
            ? { deliveryMaxDistance: toNumericOrNull(changes.deliveryMaxDistance, 2) }
            : {}),
        ...(changes.deliveryPricePerKm !== undefined
            ? { deliveryPricePerKm: toNumericOrNull(changes.deliveryPricePerKm, 2) }
            : {}),
        ...(changes.photoKey !== undefined ? { photoKey: changes.photoKey } : {}),
        ...(changes.startAt !== undefined ? { startAt: changes.startAt } : {}),
        ...(changes.endAt !== undefined ? { endAt: changes.endAt } : {}),
        ...(changes.isActive !== undefined ? { isActive: changes.isActive } : {}),
    };
}

export async function updatePackage(
    this: PrismaCatalogRepository,
    id: string,
    changes: PackageChanges,
    options: UpdatePackageOptions = {},
): Promise<PackageRecord | null> {
    try {
        return await this.db.transaction(async tx => {
            const columns = toPackageColumns(changes);
            const target = tx.orm.public.Package.where({ id });
            const row = Object.keys(columns).length > 0 ? await target.update(columns) : await target.first();
            if (row === null) return null;

            const removed = options.deleteSchedulesAt;
            if (removed !== undefined && removed.times.length > 0) {
                await tx.orm.public.Schedule.where({ packageId: id })
                    .where(schedule => schedule.date.gte(removed.from))
                    .where(schedule => schedule.deliveryTime.in([...removed.times]))
                    .deleteAll();
            }

            const moved = options.moveSchedulesAt;
            if (moved !== undefined) {
                const movedFrom = moved.from;
                for (const change of moved.changes) {
                    await tx.orm.public.Schedule.where({ packageId: id })
                        .where(schedule => schedule.date.gte(movedFrom))
                        .where(schedule => schedule.deliveryTime.eq(change.from))
                        .updateAndCount({ deliveryTime: change.to });
                }
            }
            return toPackageRecord(row);
        });
    } catch (cause) {
        if (getForeignKeyViolationConstraint(cause) === "order_menu_schedule_id_fkey") {
            throw new InvalidStateError(MEAL_TIME_IN_USE_MESSAGE, { cause });
        }
        if (getUniqueViolationConstraint(cause) === "schedule_package_id_date_delivery_time_key") {
            throw new ScheduleAlreadyExistsError({ cause });
        }
        throw new CatalogRepositoryFailureError("updatePackage", cause);
    }
}

import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { findRemovedMealTimes, MEAL_TIME_IN_USE_MESSAGE, sortMealTimes } from "../../domain/meal-times.js";
import type { OrderPeriod, Package } from "../../domain/package.domain.js";
import type { CatalogService } from "../catalog.service.js";
import type { PackageChanges, RemovedMealTimes } from "../interfaces/catalog.repository.js";
import { PackageNotFoundError } from "../interfaces/catalog.repository.js";
import { assertSalesWindow } from "./assert-sales-window.js";

export interface UpdatePackageInput {
    readonly name?: string | undefined;
    readonly description?: string | undefined;
    readonly basePrice?: number | undefined;
    readonly periods?: readonly OrderPeriod[] | undefined;
    readonly deliveryTimes?: readonly Temporal.PlainTime[] | undefined;
    readonly deliveryFreeRadius?: number | null | undefined;
    readonly deliveryMaxDistance?: number | null | undefined;
    readonly deliveryPricePerKm?: number | null | undefined;
    readonly photoKey?: string | undefined;
    readonly startAt?: Temporal.PlainDateTime | undefined;
    readonly endAt?: Temporal.PlainDateTime | null | undefined;
    readonly isActive?: boolean | undefined;
}

export async function updatePackage(this: CatalogService, id: string, input: UpdatePackageInput): Promise<Package> {
    const existing = await this.catalogRepository.findPackageById(id);
    if (existing === null) throw new PackageNotFoundError(id);

    if (input.startAt !== undefined || input.endAt !== undefined) {
        assertSalesWindow(input.startAt ?? existing.startAt, input.endAt !== undefined ? input.endAt : existing.endAt);
    }
    if (input.photoKey !== undefined && input.photoKey !== existing.photoKey) {
        await this.photoKeys.assertPhotoKeyExists(input.photoKey);
    }

    const removedTimes =
        input.deliveryTimes === undefined ? [] : findRemovedMealTimes(existing.deliveryTimes, input.deliveryTimes);
    const removal: RemovedMealTimes = { times: removedTimes, from: this.clock.now().toPlainDate() };
    if (removedTimes.length > 0) {
        const scheduleIds = await this.catalogRepository.findScheduleIdsAtTimes(id, removal);
        if (scheduleIds.length > 0) {
            const withOrders = await this.orderActivity.findSchedulesWithOrders(scheduleIds, ["Pending", "Success"]);
            if (withOrders.length > 0) throw new InvalidStateError(MEAL_TIME_IN_USE_MESSAGE);
        }
    }

    const { deliveryTimes, ...rest } = input;
    const changes: PackageChanges = {
        ...rest,
        ...(deliveryTimes !== undefined ? { deliveryTimes: sortMealTimes(deliveryTimes) } : {}),
    };
    const record = await this.catalogRepository.updatePackage(
        id,
        changes,
        removedTimes.length > 0 ? { deleteSchedulesAt: removal } : {},
    );
    if (record === null) throw new PackageNotFoundError(id);
    return this.presentPackage(record, { withSubscriberCount: true });
}

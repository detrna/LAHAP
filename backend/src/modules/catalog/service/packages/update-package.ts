import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { findRemovedMealTimes, MEAL_TIME_IN_USE_MESSAGE, sortMealTimes } from "../../domain/meal-times.js";
import type { OrderPeriod, Package } from "../../domain/package.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { assertChangeReason } from "../change-reason.js";
import type {
    MealTimeChange,
    PackageChanges,
    PackageRecord,
    RemovedMealTimes,
    UpdatePackageOptions,
} from "../interfaces/catalog.repository.js";
import { PackageNotFoundError } from "../interfaces/catalog.repository.js";
import { assertSalesWindow } from "./assert-sales-window.js";
import { renameMealTimes } from "./rename-meal-times.js";

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
    readonly deliveryTimeChanges?: readonly MealTimeChange[] | undefined;
    readonly changeReason?: string | undefined;
}

async function planRemoval(
    service: CatalogService,
    existing: PackageRecord,
    deliveryTimes: readonly Temporal.PlainTime[] | undefined,
    today: Temporal.PlainDate,
): Promise<RemovedMealTimes | undefined> {
    const times = deliveryTimes === undefined ? [] : findRemovedMealTimes(existing.deliveryTimes, deliveryTimes);
    if (times.length === 0) return undefined;

    const removal: RemovedMealTimes = { times, from: today };
    const scheduleIds = await service.catalogRepository.findScheduleIdsAtTimes(existing.id, removal);
    if (scheduleIds.length > 0) {
        const withOrders = await service.orderActivity.findSchedulesWithOrders(scheduleIds, ["Pending", "Success"]);
        if (withOrders.length > 0) throw new InvalidStateError(MEAL_TIME_IN_USE_MESSAGE);
        await service.orderActivity.deleteInactiveSlots(scheduleIds);
    }
    return removal;
}

async function planRename(
    service: CatalogService,
    existing: PackageRecord,
    input: UpdatePackageInput,
    today: Temporal.PlainDate,
): Promise<UpdatePackageOptions["moveSchedulesAt"]> {
    if (input.deliveryTimeChanges === undefined) return undefined;

    const from = today.add({ days: 1 });
    const scheduleIds = await service.catalogRepository.findScheduleIdsAtTimes(existing.id, {
        times: input.deliveryTimeChanges.map(change => change.from),
        from,
    });
    if (scheduleIds.length > 0) {
        const paid = await service.orderActivity.findSchedulesWithOrders(scheduleIds, ["Success"]);
        if (paid.length > 0) assertChangeReason(input.changeReason, "changeReason");
    }
    return { changes: input.deliveryTimeChanges, from };
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

    const today = this.clock.now().toPlainDate();
    const renamedTimes =
        input.deliveryTimeChanges !== undefined
            ? renameMealTimes(existing.deliveryTimes, input.deliveryTimeChanges)
            : undefined;
    const removal = await planRemoval(this, existing, input.deliveryTimes, today);
    const move = await planRename(this, existing, input, today);

    const { deliveryTimes, deliveryTimeChanges: _changes, changeReason: _reason, ...rest } = input;
    const nextTimes = renamedTimes ?? deliveryTimes;
    const changes: PackageChanges = {
        ...rest,
        ...(nextTimes !== undefined ? { deliveryTimes: sortMealTimes(nextTimes) } : {}),
    };
    const record = await this.catalogRepository.updatePackage(id, changes, {
        ...(removal !== undefined ? { deleteSchedulesAt: removal } : {}),
        ...(move !== undefined ? { moveSchedulesAt: move } : {}),
    });
    if (record === null) throw new PackageNotFoundError(id);
    return this.presentPackage(record, { withSubscriberCount: true });
}

import { toDbTimestamp } from "../../../../shared/time/timestamp.js";
import { sortMealTimes } from "../../domain/meal-times.js";
import type { OrderPeriod, Package } from "../../domain/package.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { assertSalesWindow } from "./assert-sales-window.js";

export interface CreatePackageInput {
    readonly name: string;
    readonly description: string;
    readonly basePrice: number;
    readonly periods: readonly OrderPeriod[];
    readonly deliveryTimes: readonly Temporal.PlainTime[];
    readonly deliveryFreeRadius?: number | null | undefined;
    readonly deliveryMaxDistance?: number | null | undefined;
    readonly deliveryPricePerKm?: number | null | undefined;
    readonly photoKey: string;
    readonly startAt?: Temporal.PlainDateTime | undefined;
    readonly endAt?: Temporal.PlainDateTime | null | undefined;
    readonly isActive?: boolean | undefined;
}

export async function createPackage(this: CatalogService, input: CreatePackageInput): Promise<Package> {
    const startAt = input.startAt ?? toDbTimestamp(this.clock.now());
    const endAt = input.endAt ?? null;
    assertSalesWindow(startAt, endAt);
    await this.photoKeys.assertPhotoKeyExists(input.photoKey);

    const record = await this.catalogRepository.createPackage({
        name: input.name,
        description: input.description,
        basePrice: input.basePrice,
        periods: input.periods,
        deliveryTimes: sortMealTimes(input.deliveryTimes),
        deliveryFreeRadius: input.deliveryFreeRadius ?? null,
        deliveryMaxDistance: input.deliveryMaxDistance ?? null,
        deliveryPricePerKm: input.deliveryPricePerKm ?? null,
        photoKey: input.photoKey,
        startAt,
        endAt,
        isActive: input.isActive ?? true,
    });
    return { ...(await this.presentPackage(record, { withSubscriberCount: false })), activeSubscriberCount: 0 };
}

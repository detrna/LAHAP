import { toIsoTimestamp } from "../../../../shared/time/timestamp.js";
import { toMealTimeView } from "../../../../shared/utils/meal-time/meal-time.js";
import { isPackageAvailable } from "../../domain/package-availability.js";
import type { Package } from "../../domain/package.domain.js";
import type { PackageRecord } from "../interfaces/catalog.repository.js";

export interface PackageContext {
    readonly now: Temporal.PlainDateTime;
    readonly photoUrl: string;
    readonly activeSubscriberCount?: number | undefined;
}

export function toPackage(record: PackageRecord, context: PackageContext): Package {
    return {
        id: record.id,
        name: record.name,
        description: record.description,
        basePrice: record.basePrice,
        periods: record.periods,
        deliveryTimes: record.deliveryTimes.map(toMealTimeView),
        deliveryFreeRadius: record.deliveryFreeRadius,
        deliveryMaxDistance: record.deliveryMaxDistance,
        deliveryPricePerKm: record.deliveryPricePerKm,
        photoKey: record.photoKey,
        photoUrl: context.photoUrl,
        startAt: toIsoTimestamp(record.startAt),
        endAt: record.endAt === null ? null : toIsoTimestamp(record.endAt),
        isActive: record.isActive,
        isAvailable: isPackageAvailable(record, context.now),
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
        ...(context.activeSubscriberCount !== undefined
            ? { activeSubscriberCount: context.activeSubscriberCount }
            : {}),
    };
}

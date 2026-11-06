import { fromNumeric, fromNumericOrNull } from "../../../../../infrastructure/database/prisma/numeric.js";
import type { OrderPeriod } from "../../../domain/package.domain.js";
import type { PackageRecord } from "../../../service/interfaces/catalog.repository.js";

export interface PackageRow {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly basePrice: string;
    readonly periods: readonly string[];
    readonly deliveryTimes: readonly Temporal.PlainTime[];
    readonly deliveryFreeRadius: string | null;
    readonly deliveryMaxDistance: string | null;
    readonly deliveryPricePerKm: string | null;
    readonly photoKey: string;
    readonly startAt: Temporal.PlainDateTime;
    readonly endAt: Temporal.PlainDateTime | null;
    readonly isActive: boolean;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export function toPackageRecord(row: PackageRow): PackageRecord {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        basePrice: fromNumeric(row.basePrice),
        periods: row.periods as OrderPeriod[],
        deliveryTimes: row.deliveryTimes,
        deliveryFreeRadius: fromNumericOrNull(row.deliveryFreeRadius),
        deliveryMaxDistance: fromNumericOrNull(row.deliveryMaxDistance),
        deliveryPricePerKm: fromNumericOrNull(row.deliveryPricePerKm),
        photoKey: row.photoKey,
        startAt: row.startAt,
        endAt: row.endAt,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

import { toNumeric, toNumericOrNull } from "../../../../../infrastructure/database/prisma/numeric.js";
import type { NewPackageRecord, PackageRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { toPackageRecord } from "./to-package-record.js";

export async function createPackage(this: PrismaCatalogRepository, record: NewPackageRecord): Promise<PackageRecord> {
    try {
        const row = await this.db.orm.public.Package.create({
            name: record.name,
            description: record.description,
            basePrice: toNumeric(record.basePrice, 2),
            periods: [...record.periods],
            deliveryTimes: [...record.deliveryTimes],
            deliveryFreeRadius: toNumericOrNull(record.deliveryFreeRadius, 2),
            deliveryMaxDistance: toNumericOrNull(record.deliveryMaxDistance, 2),
            deliveryPricePerKm: toNumericOrNull(record.deliveryPricePerKm, 2),
            photoKey: record.photoKey,
            startAt: record.startAt,
            endAt: record.endAt,
            isActive: record.isActive,
        });
        return toPackageRecord(row);
    } catch (cause) {
        throw new CatalogRepositoryFailureError("createPackage", cause);
    }
}

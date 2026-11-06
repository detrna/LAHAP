import { toPhotoUrls } from "../../../../shared/media/photo.js";
import { toDbTimestamp } from "../../../../shared/time/timestamp.js";
import type { Package } from "../../domain/package.domain.js";
import type { CatalogService } from "../catalog.service.js";
import type { PackageRecord } from "../interfaces/catalog.repository.js";
import { PackageNotFoundError } from "../interfaces/catalog.repository.js";
import { toPackage } from "./to-package.js";

export interface PresentPackagesOptions {
    readonly withSubscriberCount: boolean;
}

export async function presentPackages(
    this: CatalogService,
    records: readonly PackageRecord[],
    { withSubscriberCount }: PresentPackagesOptions,
): Promise<Package[]> {
    if (records.length === 0) return [];

    const now = this.clock.now();
    const [photoUrls, subscriberCounts] = await Promise.all([
        toPhotoUrls(
            this.objectStorage,
            records.map(record => record.photoKey),
        ),
        withSubscriberCount
            ? this.orderActivity.countActiveSubscribers(
                  records.map(record => record.id),
                  now.toPlainDate(),
              )
            : undefined,
    ]);

    return records.map((record, index) =>
        toPackage(record, {
            now: toDbTimestamp(now),
            photoUrl: photoUrls[index] ?? "",
            ...(subscriberCounts !== undefined ? { activeSubscriberCount: subscriberCounts.get(record.id) ?? 0 } : {}),
        }),
    );
}

export async function presentPackage(
    this: CatalogService,
    record: PackageRecord,
    options: PresentPackagesOptions,
): Promise<Package> {
    const [item] = await this.presentPackages([record], options);
    if (item === undefined) throw new PackageNotFoundError(record.id);
    return item;
}

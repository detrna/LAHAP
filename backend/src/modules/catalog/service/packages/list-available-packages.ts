import { toDbTimestamp } from "../../../../shared/time/timestamp.js";
import type { CatalogService } from "../catalog.service.js";
import type { PackagePage } from "./list-packages.js";

export interface ListAvailablePackagesInput {
    readonly search?: string | undefined;
    readonly skip: number;
    readonly take: number;
}

export async function listAvailablePackages(
    this: CatalogService,
    input: ListAvailablePackagesInput,
): Promise<PackagePage> {
    const { items, total } = await this.catalogRepository.listPackages({
        ...input,
        availableAt: toDbTimestamp(this.clock.now()),
    });
    return { items: await this.presentPackages(items, { withSubscriberCount: false }), total };
}

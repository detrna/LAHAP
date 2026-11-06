import type { Package } from "../../domain/package.domain.js";
import type { CatalogService } from "../catalog.service.js";

export interface ListPackagesInput {
    readonly search?: string | undefined;
    readonly isActive?: boolean | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface PackagePage {
    readonly items: readonly Package[];
    readonly total: number;
}

export async function listPackages(this: CatalogService, input: ListPackagesInput): Promise<PackagePage> {
    const { items, total } = await this.catalogRepository.listPackages(input);
    return { items: await this.presentPackages(items, { withSubscriberCount: true }), total };
}

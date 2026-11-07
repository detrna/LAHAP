import type { Package } from "../../../catalog/domain/package.domain.js";

export interface PackageNames {
    getPackagesByIds(ids: readonly string[]): Promise<readonly Pick<Package, "id" | "name">[]>;
}

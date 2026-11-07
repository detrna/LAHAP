import { and, or } from "@prisma/orm-postgres/orm-client";
import type { Db } from "../../../../../infrastructure/database/prisma/db.js";
import { toContainsPattern } from "../../../../../infrastructure/database/prisma/like.js";
import type { PackageListQuery, PackageListRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { toPackageRecord } from "./to-package-record.js";

export function matchingPackages(orm: Db["orm"], query: Omit<PackageListQuery, "skip" | "take">) {
    let packages = orm.public.Package;

    if (query.search !== undefined) {
        const pattern = toContainsPattern(query.search);
        packages = packages.where(item => item.name.ilike(pattern));
    }
    if (query.isActive !== undefined) {
        packages = packages.where({ isActive: query.isActive });
    }
    if (query.availableAt !== undefined) {
        const now = query.availableAt;
        packages = packages.where(item =>
            and(item.isActive.eq(true), item.startAt.lte(now), or(item.endAt.isNull(), item.endAt.gt(now))),
        );
    }

    return packages;
}

export async function listPackages(this: PrismaCatalogRepository, query: PackageListQuery): Promise<PackageListRecord> {
    try {
        const [rows, totals] = await Promise.all([
            matchingPackages(this.db.orm, query)
                .orderBy([item => item.createdAt.desc(), item => item.id.desc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            matchingPackages(this.db.orm, query).aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return { items: rows.map(toPackageRecord), total: totals.total };
    } catch (cause) {
        throw new CatalogRepositoryFailureError("listPackages", cause);
    }
}

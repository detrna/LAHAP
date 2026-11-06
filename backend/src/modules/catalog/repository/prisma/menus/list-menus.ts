import type { Db } from "../../../../../infrastructure/database/prisma/db.js";
import { toContainsPattern } from "../../../../../infrastructure/database/prisma/like.js";
import type { MenuListQuery, MenuListRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { menusWithIngredients } from "./queries.js";
import { toMenuRecord } from "./to-menu-record.js";

function matchingMenus<T extends ReturnType<typeof menusWithIngredients> | Db["orm"]["public"]["Menu"]>(
    menus: T,
    query: MenuListQuery,
): T {
    let filtered = menus;
    if (query.search !== undefined) {
        const pattern = toContainsPattern(query.search);
        filtered = filtered.where(menu => menu.name.ilike(pattern)) as T;
    }
    if (query.isAlternative !== undefined) {
        filtered = filtered.where({ isAlternative: query.isAlternative }) as T;
    }
    return filtered;
}

export async function listMenus(this: PrismaCatalogRepository, query: MenuListQuery): Promise<MenuListRecord> {
    try {
        const [rows, totals] = await Promise.all([
            matchingMenus(menusWithIngredients(this.db.orm), query)
                .orderBy([menu => menu.name.asc(), menu => menu.id.asc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            matchingMenus(this.db.orm.public.Menu, query).aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return { items: rows.map(toMenuRecord), total: totals.total };
    } catch (cause) {
        throw new CatalogRepositoryFailureError("listMenus", cause);
    }
}

import type { Menu, MenuAudience } from "../../domain/menu.domain.js";
import type { MenuSchedule } from "../../domain/schedule.domain.js";
import type { CatalogService } from "../catalog.service.js";
import type { ScheduleRecord } from "../interfaces/catalog.repository.js";
import { MenuScheduleNotFoundError } from "../interfaces/catalog.repository.js";
import { toSchedule } from "./to-schedule.js";

export async function presentSchedules(
    this: CatalogService,
    records: readonly ScheduleRecord[],
    audience: MenuAudience,
): Promise<MenuSchedule[]> {
    if (records.length === 0) return [];

    const menuIds = [...new Set(records.flatMap(record => [record.primaryMenuId, record.alternativeMenuId]))].filter(
        (id): id is string => id !== null,
    );
    const menus = await this.presentMenus(await this.catalogRepository.findMenusByIds(menuIds), {
        withIngredients: false,
        withCooks: audience === "staff",
    });
    const menuById = new Map<string, Menu>(menus.map(menu => [menu.id, menu]));
    return records.map(record => toSchedule(record, menuById));
}

export async function presentSchedule(this: CatalogService, record: ScheduleRecord): Promise<MenuSchedule> {
    const [item] = await this.presentSchedules([record], "staff");
    if (item === undefined) throw new MenuScheduleNotFoundError(record.id);
    return item;
}

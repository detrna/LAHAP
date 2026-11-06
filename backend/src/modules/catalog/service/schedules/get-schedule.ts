import type { MenuSchedule } from "../../domain/schedule.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { MenuScheduleNotFoundError } from "../interfaces/catalog.repository.js";

export async function getSchedule(this: CatalogService, id: string): Promise<MenuSchedule> {
    const record = await this.catalogRepository.findScheduleById(id);
    if (record === null) throw new MenuScheduleNotFoundError(id);
    return this.presentSchedule(record);
}

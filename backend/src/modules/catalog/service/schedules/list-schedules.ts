import type { MenuSchedule } from "../../domain/schedule.domain.js";
import type { CatalogService } from "../catalog.service.js";

export interface ListSchedulesInput {
    readonly packageId?: string | undefined;
    readonly from?: Temporal.PlainDate | undefined;
    readonly to?: Temporal.PlainDate | undefined;
    readonly isPublished?: boolean | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface SchedulePage {
    readonly items: readonly MenuSchedule[];
    readonly total: number;
}

export async function listSchedules(this: CatalogService, input: ListSchedulesInput): Promise<SchedulePage> {
    const { items, total } = await this.catalogRepository.listSchedules(input);
    return { items: await this.presentSchedules(items, "staff"), total };
}

import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import type { PublishMenuSchedulesResult } from "../../domain/schedule.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { MenuScheduleNotFoundError, PackageNotFoundError } from "../interfaces/catalog.repository.js";
import { NO_PRIMARY_MENU_MESSAGE } from "./apply-schedule-updates.js";

export type PublishSchedulesInput =
    | { readonly ids: readonly string[]; readonly publish: boolean }
    | {
          readonly packageId: string;
          readonly from: Temporal.PlainDate;
          readonly to: Temporal.PlainDate;
          readonly publish: boolean;
      };

export async function publishSchedules(
    this: CatalogService,
    input: PublishSchedulesInput,
): Promise<PublishMenuSchedulesResult> {
    if ("ids" in input) {
        const records = await this.catalogRepository.findSchedules({ ids: input.ids });
        const found = new Set(records.map(record => record.id));
        const missing = input.ids.find(id => !found.has(id));
        if (missing !== undefined) throw new MenuScheduleNotFoundError(missing);
        if (input.publish && records.some(record => record.primaryMenuId === null)) {
            throw new InvalidStateError(NO_PRIMARY_MENU_MESSAGE);
        }
        return { updatedCount: await this.catalogRepository.setSchedulesPublished({ ids: input.ids }, input.publish) };
    }

    if ((await this.catalogRepository.findPackageById(input.packageId)) === null) {
        throw new PackageNotFoundError(input.packageId);
    }
    const target = { packageId: input.packageId, from: input.from, to: input.to };
    return { updatedCount: await this.catalogRepository.setSchedulesPublished(target, input.publish) };
}

import { announceScheduleChanges, type ScheduleChange } from "./announce-schedule-changes.js";
import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { ValidationError } from "../../../../shared/errors/validation-error.js";
import type { ValidationIssue } from "../../../../shared/response/error-response.js";
import { isSameClockTime } from "../../../../shared/utils/meal-time/meal-time.js";
import type { MenuSchedule } from "../../domain/schedule.domain.js";
import {
    isFutureMove,
    isInsidePeriods,
    MOVE_OUTSIDE_PERIOD_MESSAGE,
    MOVE_TO_PAST_OR_TODAY_MESSAGE,
    type SubscriptionPeriod,
} from "../../domain/schedule-moves.js";
import type { CatalogService } from "../catalog.service.js";
import { assertChangeReason } from "../change-reason.js";
import type { PackageRecord, ScheduleChanges, ScheduleRecord } from "../interfaces/catalog.repository.js";
import { MenuScheduleNotFoundError } from "../interfaces/catalog.repository.js";
import { alternativeIssues, dateIssue, deliveryTimeIssue, loadMenuKinds } from "./schedule-issues.js";

export const ALTERNATIVE_IN_USE_MESSAGE = "alternative menu is used by orders";
export const NO_PRIMARY_MENU_MESSAGE = "schedule has no primary menu";

export interface UpdateScheduleInput {
    readonly date?: Temporal.PlainDate | undefined;
    readonly deliveryTime?: Temporal.PlainTime | undefined;
    readonly primaryMenuId?: string | undefined;
    readonly alternativeMenuId?: string | null | undefined;
    readonly isPublished?: boolean | undefined;
    readonly changeReason?: string | undefined;
}

export interface UpdateScheduleItem extends UpdateScheduleInput {
    readonly id: string;
}

export type ItemPath = (index: number, field: string) => string;

interface PlannedUpdate {
    readonly item: UpdateScheduleItem;
    readonly existing: ScheduleRecord;
    readonly date: Temporal.PlainDate;
    readonly dateChanged: boolean;
    readonly moved: boolean;
    readonly menuChanged: boolean;
    readonly alternativeRemoved: boolean;
    readonly path: (field: string) => string;
}

function plan(item: UpdateScheduleItem, existing: ScheduleRecord, path: (field: string) => string): PlannedUpdate {
    const date = item.date ?? existing.date;
    const dateChanged = !date.equals(existing.date);
    const timeChanged = item.deliveryTime !== undefined && !isSameClockTime(item.deliveryTime, existing.deliveryTime);
    const primaryMenuId = item.primaryMenuId ?? existing.primaryMenuId;
    const alternativeMenuId =
        item.alternativeMenuId !== undefined ? item.alternativeMenuId : existing.alternativeMenuId;
    return {
        item,
        existing,
        date,
        dateChanged,
        moved: dateChanged || timeChanged,
        menuChanged: primaryMenuId !== existing.primaryMenuId || alternativeMenuId !== existing.alternativeMenuId,
        alternativeRemoved: existing.alternativeMenuId !== null && alternativeMenuId === null,
        path,
    };
}

function itemIssues(
    planned: PlannedUpdate,
    pkg: PackageRecord | undefined,
    kinds: ReadonlyMap<string, boolean>,
    today: Temporal.PlainDate,
): ValidationIssue[] {
    const { item, existing, path } = planned;
    const primaryMenuId = item.primaryMenuId ?? existing.primaryMenuId;
    const alternativeMenuId =
        item.alternativeMenuId !== undefined ? item.alternativeMenuId : existing.alternativeMenuId;
    return [
        ...(planned.dateChanged ? dateIssue(planned.date, today, path) : []),
        ...(item.deliveryTime !== undefined && pkg !== undefined && planned.moved
            ? deliveryTimeIssue(item.deliveryTime, pkg, path)
            : []),
        ...(planned.menuChanged ? alternativeIssues(primaryMenuId, alternativeMenuId, kinds, path) : []),
    ];
}

function toChanges(item: UpdateScheduleItem): ScheduleChanges {
    return {
        ...(item.date !== undefined ? { date: item.date } : {}),
        ...(item.deliveryTime !== undefined ? { deliveryTime: item.deliveryTime } : {}),
        ...(item.primaryMenuId !== undefined ? { primaryMenuId: item.primaryMenuId } : {}),
        ...(item.alternativeMenuId !== undefined ? { alternativeMenuId: item.alternativeMenuId } : {}),
        ...(item.isPublished !== undefined ? { isPublished: item.isPublished } : {}),
    };
}

async function findOrderState(service: CatalogService, planned: readonly PlannedUpdate[]) {
    const affected = planned.filter(entry => entry.moved || entry.menuChanged || entry.alternativeRemoved);
    const ids = affected.map(entry => entry.existing.id);
    if (ids.length === 0) {
        return { active: new Set<string>(), paid: new Set<string>(), usingAlternative: new Set<string>(), periods: [] };
    }

    const removing = affected.filter(entry => entry.alternativeRemoved).map(entry => entry.existing.id);
    const [active, paid, usingAlternative] = await Promise.all([
        service.orderActivity.findSchedulesWithOrders(ids, ["Pending", "Success"]),
        service.orderActivity.findSchedulesWithOrders(ids, ["Success"]),
        removing.length > 0 ? service.orderActivity.findSchedulesUsingAlternative(removing) : [],
    ]);
    const activeIds = new Set(active);
    const movedDates = affected
        .filter(entry => entry.dateChanged && activeIds.has(entry.existing.id))
        .map(entry => entry.existing.id);
    const periods: readonly SubscriptionPeriod[] =
        movedDates.length > 0 ? await service.orderActivity.findSubscriptionPeriods(movedDates) : [];
    return { active: activeIds, paid: new Set(paid), usingAlternative: new Set(usingAlternative), periods };
}

export async function applyScheduleUpdates(
    service: CatalogService,
    items: readonly UpdateScheduleItem[],
    pathOf: ItemPath,
): Promise<readonly MenuSchedule[]> {
    const today = service.clock.now().toPlainDate();
    const existing = await service.catalogRepository.findSchedules({ ids: items.map(item => item.id) });
    const existingById = new Map(existing.map(record => [record.id, record]));
    const missing = items.find(item => !existingById.has(item.id));
    if (missing !== undefined) throw new MenuScheduleNotFoundError(missing.id);

    const planned = items.map((item, index) =>
        plan(item, existingById.get(item.id) as ScheduleRecord, field => pathOf(index, field)),
    );
    const packages = await service.catalogRepository.findPackagesByIds([
        ...new Set(existing.map(record => record.packageId)),
    ]);
    const packageById = new Map(packages.map(pkg => [pkg.id, pkg]));
    const kinds = await loadMenuKinds(
        service.catalogRepository,
        items.flatMap(item => [item.primaryMenuId, item.alternativeMenuId]),
    );

    const issues = planned.flatMap(entry => itemIssues(entry, packageById.get(entry.existing.packageId), kinds, today));
    if (issues.length > 0) throw new ValidationError(issues);

    for (const { item, existing: record } of planned) {
        if (item.isPublished === true && (item.primaryMenuId ?? record.primaryMenuId) === null) {
            throw new InvalidStateError(NO_PRIMARY_MENU_MESSAGE);
        }
    }

    const state = await findOrderState(service, planned);
    const announcements: ScheduleChange[] = [];
    for (const entry of planned) {
        const id = entry.existing.id;
        if (entry.moved && state.active.has(id)) {
            if (!isFutureMove(entry.existing.date, entry.date, today)) {
                throw new InvalidStateError(MOVE_TO_PAST_OR_TODAY_MESSAGE);
            }
            const periods = state.periods.filter(period => period.scheduleId === id);
            if (entry.dateChanged && !isInsidePeriods(entry.date, periods)) {
                throw new InvalidStateError(MOVE_OUTSIDE_PERIOD_MESSAGE);
            }
        }
        if (entry.alternativeRemoved && state.usingAlternative.has(id)) {
            throw new InvalidStateError(ALTERNATIVE_IN_USE_MESSAGE);
        }
        if ((entry.moved || entry.menuChanged) && state.paid.has(id)) {
            assertChangeReason(entry.item.changeReason, entry.path("changeReason"));
            announcements.push({ scheduleId: id, changeReason: entry.item.changeReason as string });
        }
    }

    const records = await service.catalogRepository.updateSchedules(
        items.map(item => ({ id: item.id, changes: toChanges(item) })),
    );
    await announceScheduleChanges(service, announcements);
    return service.presentSchedules(records);
}

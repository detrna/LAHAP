import type { CatalogService } from "../catalog.service.js";

export const SCHEDULE_CHANGE_TITLE = "Perubahan jadwal menu";

export interface ScheduleChange {
    readonly scheduleId: string;
    readonly changeReason: string;
}

export async function announceScheduleChanges(
    service: CatalogService,
    changes: readonly ScheduleChange[],
): Promise<void> {
    if (changes.length === 0) return;

    let schedules;
    try {
        schedules = await service.catalogRepository.findSchedules({ ids: changes.map(change => change.scheduleId) });
    } catch (err) {
        service.logger.warn({ err }, "schedule change announcement failed, the change itself is saved");
        return;
    }
    const byId = new Map(schedules.map(schedule => [schedule.id, schedule]));

    for (const { scheduleId, changeReason } of changes) {
        const schedule = byId.get(scheduleId);
        if (schedule === undefined) continue;
        const day = schedule.date.toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        const hour = schedule.deliveryTime.toString({ smallestUnit: "minute" });
        try {
            await service.announcer.announce({
                scope: "SCHEDULE",
                menuScheduleId: scheduleId,
                title: SCHEDULE_CHANGE_TITLE,
                body: `Jadwal menu tanggal ${day} pukul ${hour} diperbarui. Alasan: ${changeReason}`,
            });
        } catch (err) {
            service.logger.warn({ err, scheduleId }, "schedule change announcement failed, the change itself is saved");
        }
    }
}

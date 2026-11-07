import { formatIndonesianDate } from "../../../shared/time/indonesian-date.js";

export const REMINDER_WINDOW_DAYS = 7;

export interface ReminderWindow {
    readonly from: Temporal.PlainDate;
    readonly to: Temporal.PlainDate;
}

export interface ReminderPackage {
    readonly id: string;
    readonly name: string;
}

export interface ReminderSchedule {
    readonly packageId: string;
    readonly isPublished: boolean;
}

export interface EmptyPackage {
    readonly packageId: string;
    readonly name: string;
    readonly draftCount: number;
}

export interface MenuReminder {
    readonly title: string;
    readonly body: string;
}

export function reminderWindow(today: Temporal.PlainDate): ReminderWindow {
    return { from: today.add({ days: 1 }), to: today.add({ days: REMINDER_WINDOW_DAYS }) };
}

export function findPackagesWithoutPublishedSchedules(
    packages: readonly ReminderPackage[],
    schedules: readonly ReminderSchedule[],
): readonly EmptyPackage[] {
    const published = new Set<string>();
    const drafts = new Map<string, number>();
    for (const schedule of schedules) {
        if (schedule.isPublished) published.add(schedule.packageId);
        else drafts.set(schedule.packageId, (drafts.get(schedule.packageId) ?? 0) + 1);
    }

    return packages
        .filter(item => !published.has(item.id))
        .map(item => ({ packageId: item.id, name: item.name, draftCount: drafts.get(item.id) ?? 0 }))
        .sort((a, b) => a.name.localeCompare(b.name, "id-ID"));
}

export function buildMenuReminder(window: ReminderWindow, emptyPackages: readonly EmptyPackage[]): MenuReminder {
    const from = formatIndonesianDate(window.from, "short-weekday");
    const to = formatIndonesianDate(window.to, "short-weekday");
    const lines = emptyPackages.map(item =>
        item.draftCount > 0 ? `- ${item.name} (${item.draftCount} draf menunggu publikasi)` : `- ${item.name}`,
    );
    return {
        title: `Menu ${REMINDER_WINDOW_DAYS} hari ke depan belum terisi`,
        body: [`Belum ada menu terpublikasi untuk ${from} – ${to}:`, ...lines].join("\n"),
    };
}

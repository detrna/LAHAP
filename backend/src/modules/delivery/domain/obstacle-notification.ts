import { formatIndonesianDate } from "../../../shared/time/indonesian-date.js";

export const OBSTACLE_NOTIFICATION_TITLE = "Kendala pengantaran";

export interface ObstacleNotificationInput {
    readonly date: Temporal.PlainDate;
    readonly time: string;
    readonly note: string;
}

export function buildObstacleNotification({ date, time, note }: ObstacleNotificationInput) {
    return {
        title: OBSTACLE_NOTIFICATION_TITLE,
        body: `${formatIndonesianDate(date, "short-weekday")} · ${time} — ${note}`,
    };
}

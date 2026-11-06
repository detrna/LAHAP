import type { SubscriptionDisplayStatus, SubscriptionStatus } from "./subscription.domain.js";

export interface DisplayStatusInput {
    readonly status: SubscriptionStatus;
    readonly startDate: Temporal.PlainDate;
    readonly endDate: Temporal.PlainDate;
}

export function toDisplayStatus(
    input: DisplayStatusInput,
    today: Temporal.PlainDate,
): SubscriptionDisplayStatus | null {
    if (input.status !== "Success") return null;
    if (Temporal.PlainDate.compare(today, input.startDate) < 0) return "Akan Datang";
    if (Temporal.PlainDate.compare(today, input.endDate) > 0) return "Selesai";
    return "Aktif";
}

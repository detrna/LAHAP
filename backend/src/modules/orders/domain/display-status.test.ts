import { describe, expect, it } from "vitest";
import { SUBSCRIPTION_STATUSES } from "./subscription.domain.js";
import { toDisplayStatus } from "./display-status.js";

const date = (value: string) => Temporal.PlainDate.from(value);
const paid = { status: "Success" as const, startDate: date("2026-11-10"), endDate: date("2026-11-14") };

describe("toDisplayStatus", () => {
    it.each([
        ["2026-11-09", "Akan Datang"],
        ["2026-11-10", "Aktif"],
        ["2026-11-14", "Aktif"],
        ["2026-11-15", "Selesai"],
    ])("on %s is %s", (today, expected) => {
        expect(toDisplayStatus(paid, date(today))).toBe(expected);
    });

    it.each(SUBSCRIPTION_STATUSES.filter(status => status !== "Success"))("is null for %s", status => {
        expect(toDisplayStatus({ ...paid, status }, date("2026-11-12"))).toBeNull();
    });
});

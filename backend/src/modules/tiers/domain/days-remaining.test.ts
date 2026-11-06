import { describe, expect, it } from "vitest";
import { daysRemaining } from "./days-remaining.js";

const jakarta = (value: string) => Temporal.ZonedDateTime.from(`${value}[Asia/Jakarta]`);
const utc = (value: string) => Temporal.PlainDateTime.from(value);

describe("daysRemaining (unit)", () => {
    it("counts Jakarta calendar days from today to the expiry date", () => {
        expect(daysRemaining(utc("2026-12-03T01:00:00"), jakarta("2026-11-03T08:00:00+07:00"))).toBe(30);
    });

    it("is 0 on the expiry day", () => {
        expect(daysRemaining(utc("2026-11-03T10:00:00"), jakarta("2026-11-03T08:00:00+07:00"))).toBe(0);
    });

    it("uses the Jakarta date of the expiry, which can be the day after the UTC date", () => {
        expect(daysRemaining(utc("2026-11-03T18:00:00"), jakarta("2026-11-03T08:00:00+07:00"))).toBe(1);
        expect(daysRemaining(utc("2026-11-03T16:59:59"), jakarta("2026-11-03T08:00:00+07:00"))).toBe(0);
    });

    it("changes at Jakarta midnight, not UTC midnight", () => {
        const expiresAt = utc("2026-11-10T01:00:00");

        expect(daysRemaining(expiresAt, jakarta("2026-11-03T23:59:59+07:00"))).toBe(7);
        expect(daysRemaining(expiresAt, jakarta("2026-11-04T00:00:00+07:00"))).toBe(6);
    });

    it("never goes below 0", () => {
        expect(daysRemaining(utc("2026-10-01T00:00:00"), jakarta("2026-11-03T08:00:00+07:00"))).toBe(0);
    });
});

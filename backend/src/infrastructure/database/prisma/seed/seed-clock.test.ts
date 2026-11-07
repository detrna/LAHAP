import { describe, expect, it } from "vitest";
import { SeedClock } from "./seed-clock.js";

const at = (value: string) => Temporal.ZonedDateTime.from(`${value}[Asia/Jakarta]`);

describe("SeedClock (unit)", () => {
    it("reports the instant it was created with, in the business time zone", () => {
        const clock = new SeedClock(Temporal.ZonedDateTime.from("2026-11-01T03:00:00Z[UTC]"));

        expect(clock.now().toString()).toBe("2026-11-01T10:00:00+07:00[Asia/Jakarta]");
    });

    it("moves forward when set to a later or the same instant", () => {
        const clock = new SeedClock(at("2026-11-01T10:00:00+07:00"));

        clock.set(at("2026-11-01T10:00:00+07:00"));
        clock.set(at("2026-11-02T08:30:00+07:00"));

        expect(clock.now().toString()).toBe("2026-11-02T08:30:00+07:00[Asia/Jakarta]");
    });

    it("refuses to move backwards", () => {
        const clock = new SeedClock(at("2026-11-02T08:30:00+07:00"));

        expect(() => clock.set(at("2026-11-02T08:29:59+07:00"))).toThrow("seed clock cannot move backwards");
        expect(clock.now().toString()).toBe("2026-11-02T08:30:00+07:00[Asia/Jakarta]");
    });

    it("never moves back when a later time is requested through advanceTo", () => {
        const clock = new SeedClock(at("2026-11-02T12:00:00+07:00"));

        clock.advanceTo(at("2026-11-02T09:00:00+07:00"));
        expect(clock.now().toString()).toBe("2026-11-02T12:00:00+07:00[Asia/Jakarta]");

        clock.advanceTo(at("2026-11-02T13:00:00+07:00"));
        expect(clock.now().toString()).toBe("2026-11-02T13:00:00+07:00[Asia/Jakarta]");
    });
});

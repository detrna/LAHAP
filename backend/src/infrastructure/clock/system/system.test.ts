import { describe, expect, it } from "vitest";
import { SystemClock } from "./system.js";

describe("SystemClock (unit)", () => {
    it("defaults to the business time zone", () => {
        const clock = new SystemClock();

        expect(clock.timeZone).toBe("Asia/Jakarta");
        expect(clock.now().timeZoneId).toBe("Asia/Jakarta");
        expect(clock.now().offset).toBe("+07:00");
    });

    it("returns the current instant", () => {
        const before = Temporal.Now.instant();
        const now = new SystemClock().now().toInstant();
        const after = Temporal.Now.instant();

        expect(Temporal.Instant.compare(before, now)).toBeLessThanOrEqual(0);
        expect(Temporal.Instant.compare(now, after)).toBeLessThanOrEqual(0);
    });

    it("fails fast on an unknown time zone", () => {
        expect(() => new SystemClock("Mars/Olympus_Mons")).toThrow("invalid clock time zone: Mars/Olympus_Mons");
    });
});

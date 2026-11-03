import { describe, expect, it } from "vitest";
import { createFixedClock, DEFAULT_FIXED_NOW } from "./clock.js";

describe("createFixedClock", () => {
    it("is frozen at the default moment", () => {
        const clock = createFixedClock();

        expect(clock.now().toString()).toBe(DEFAULT_FIXED_NOW);
        expect(clock.now()).toBe(clock.now());
    });

    it("converts other zones to Asia/Jakarta", () => {
        const clock = createFixedClock("2026-11-09T16:59:59+00:00[UTC]");

        expect(clock.now().toString()).toBe("2026-11-09T23:59:59+07:00[Asia/Jakarta]");
    });

    it("can be set and advanced", () => {
        const clock = createFixedClock("2026-11-09T23:59:59+07:00[Asia/Jakarta]");

        clock.advance({ seconds: 1 });
        expect(clock.now().toPlainDate().toString()).toBe("2026-11-10");

        clock.set("2026-12-01T07:00:00+07:00[Asia/Jakarta]");
        expect(clock.now().toPlainDateTime().toString()).toBe("2026-12-01T07:00:00");
    });
});

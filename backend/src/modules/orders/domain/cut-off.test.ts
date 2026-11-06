import { describe, expect, it } from "vitest";
import { cutoffAt, isBeforeCutoff } from "./cut-off.js";

const date = (value: string) => Temporal.PlainDate.from(value);
const at = (value: string) => Temporal.ZonedDateTime.from(value);

describe("cutoffAt", () => {
    it("is the last millisecond of the day before, in Jakarta", () => {
        expect(cutoffAt(date("2026-11-10")).toString()).toBe("2026-11-09T23:59:59.999+07:00[Asia/Jakarta]");
    });

    it("crosses a month boundary", () => {
        expect(cutoffAt(date("2026-12-01")).toPlainDate().toString()).toBe("2026-11-30");
    });
});

describe("isBeforeCutoff", () => {
    const start = date("2026-11-10");

    it.each([
        ["2026-11-09T23:59:59.999+07:00[Asia/Jakarta]", true],
        ["2026-11-09T08:00:00+07:00[Asia/Jakarta]", true],
        ["2026-11-10T00:00:00+07:00[Asia/Jakarta]", false],
        ["2026-11-10T12:00:00+07:00[Asia/Jakarta]", false],
        ["2026-11-11T00:00:00+07:00[Asia/Jakarta]", false],
    ])("at %s is %s", (now, expected) => {
        expect(isBeforeCutoff(at(now), start)).toBe(expected);
    });

    it("reads the Jakarta date whatever the zone of now", () => {
        expect(isBeforeCutoff(at("2026-11-09T17:00:00+00:00[UTC]"), start)).toBe(false);
        expect(isBeforeCutoff(at("2026-11-09T16:59:59+00:00[UTC]"), start)).toBe(true);
    });
});

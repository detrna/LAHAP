import { describe, expect, it } from "vitest";
import { reportPeriodRange } from "./report-period.js";

const today = Temporal.PlainDate.from("2026-11-12");
const asStrings = (range: { from: Temporal.PlainDate; to: Temporal.PlainDate }) => [
    range.from.toString(),
    range.to.toString(),
];

describe("reportPeriodRange", () => {
    it.each([
        ["today", ["2026-11-12", "2026-11-12"]],
        ["week", ["2026-11-09", "2026-11-15"]],
        ["month", ["2026-11-01", "2026-11-30"]],
    ] as const)("covers %s", (period, expected) => {
        expect(asStrings(reportPeriodRange(period, today))).toEqual(expected);
    });
});

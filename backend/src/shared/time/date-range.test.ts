import { describe, expect, it } from "vitest";
import { InvalidDateRangeError, resolveDateRange } from "./date-range.js";

const date = (iso: string) => Temporal.PlainDate.from(iso);
const options = { defaultFrom: date("2026-11-09"), defaultSpanDays: 7, maxDays: 31 };

describe("resolveDateRange", () => {
    it("uses the default start and span when nothing is given", () => {
        const range = resolveDateRange({}, options);

        expect([range.from.toString(), range.to.toString()]).toEqual(["2026-11-09", "2026-11-15"]);
    });

    it("spans the default number of days from a given start", () => {
        const range = resolveDateRange({ from: date("2026-12-01") }, options);

        expect(range.to.toString()).toBe("2026-12-07");
    });

    it("keeps a given range as it is", () => {
        const range = resolveDateRange({ from: date("2026-11-01"), to: date("2026-11-03") }, options);

        expect([range.from.toString(), range.to.toString()]).toEqual(["2026-11-01", "2026-11-03"]);
    });

    it("treats a one-day default span as from = to", () => {
        const range = resolveDateRange({}, { ...options, defaultSpanDays: 1 });

        expect(range.to.equals(range.from)).toBe(true);
    });

    it("rejects to before from with a VALIDATION_ERROR issue on to", () => {
        const attempt = () => resolveDateRange({ from: date("2026-11-10"), to: date("2026-11-09") }, options);

        expect(attempt).toThrow(InvalidDateRangeError);
        expect(attempt).toThrow(
            expect.objectContaining({
                code: "VALIDATION_ERROR",
                statusCode: 400,
                issues: [expect.objectContaining({ target: "query", path: "to", message: "must not be before from" })],
            }),
        );
    });

    it("accepts a span of exactly maxDays and rejects one day more", () => {
        const from = date("2026-11-01");

        expect(resolveDateRange({ from, to: date("2026-12-01") }, options).to.toString()).toBe("2026-12-01");
        expect(() => resolveDateRange({ from, to: date("2026-12-02") }, options)).toThrow(
            expect.objectContaining({
                issues: [expect.objectContaining({ path: "to", message: "must span at most 31 days" })],
            }),
        );
    });
});

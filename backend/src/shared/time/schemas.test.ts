import { describe, expect, it } from "vitest";
import { isoDateSchema, isoTimestampSchema } from "./schemas.js";

describe("isoTimestampSchema", () => {
    it("parses a date-time with an offset into the stored UTC value", () => {
        expect(isoTimestampSchema.parse("2026-11-03T08:00:00+07:00").toString()).toBe("2026-11-03T01:00:00");
        expect(isoTimestampSchema.parse("2026-11-03T01:00:00.500Z").toString()).toBe("2026-11-03T01:00:00.5");
    });

    it.each(["2026-11-03T08:00:00", "2026-11-03", "not-a-date", ""])("rejects %j", value => {
        expect(isoTimestampSchema.safeParse(value).success).toBe(false);
    });
});

describe("isoDateSchema", () => {
    it("parses YYYY-MM-DD into a PlainDate", () => {
        expect(isoDateSchema.parse("2026-11-03").equals(Temporal.PlainDate.from("2026-11-03"))).toBe(true);
    });

    it("accepts a leap day in a leap year", () => {
        expect(isoDateSchema.parse("2028-02-29").toString()).toBe("2028-02-29");
    });

    it.each(["2026-02-29", "2026-02-30", "2026-13-01", "2026-1-03", "2026-11-03T00:00:00Z", ""])(
        "rejects %j",
        value => {
            expect(isoDateSchema.safeParse(value).success).toBe(false);
        },
    );
});

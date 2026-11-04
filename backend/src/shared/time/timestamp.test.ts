import { describe, expect, it } from "vitest";
import { createFixedClock } from "../../../tests/utils/factory/clock/clock.js";
import { toDbTimestamp, toIsoTimestamp } from "./timestamp.js";

describe("toIsoTimestamp", () => {
    it("renders a stored UTC timestamp in Asia/Jakarta with its +07:00 offset and millisecond precision", () => {
        expect(toIsoTimestamp(Temporal.PlainDateTime.from("2026-11-03T01:00:00"))).toBe(
            "2026-11-03T08:00:00.000+07:00",
        );
    });

    it("moves to the next Jakarta day after 17:00 UTC", () => {
        expect(toIsoTimestamp(Temporal.PlainDateTime.from("2026-11-03T17:30:00"))).toBe(
            "2026-11-04T00:30:00.000+07:00",
        );
    });

    it("truncates Postgres microseconds to milliseconds", () => {
        expect(toIsoTimestamp(Temporal.PlainDateTime.from("2026-11-03T16:59:59.123456"))).toBe(
            "2026-11-03T23:59:59.123+07:00",
        );
    });

    it("produces a string Date parses to the same instant", () => {
        const iso = toIsoTimestamp(Temporal.PlainDateTime.from("2026-11-03T01:00:00"));

        expect(new Date(iso).toISOString()).toBe("2026-11-03T01:00:00.000Z");
    });
});

describe("toDbTimestamp", () => {
    it("converts a clock reading to the UTC wall-clock value Timestamp columns store", () => {
        const now = createFixedClock("2026-11-03T08:00:00+07:00[Asia/Jakarta]").now();

        expect(toDbTimestamp(now).toString()).toBe("2026-11-03T01:00:00");
    });

    it("round-trips through toIsoTimestamp", () => {
        const now = createFixedClock("2026-11-09T23:59:59.250+07:00[Asia/Jakarta]").now();

        expect(toIsoTimestamp(toDbTimestamp(now))).toBe("2026-11-09T23:59:59.250+07:00");
    });
});

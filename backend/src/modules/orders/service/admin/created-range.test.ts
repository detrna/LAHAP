import { describe, expect, it } from "vitest";
import { toCreatedRange } from "./created-range.js";

describe("toCreatedRange", () => {
    it("turns Jakarta dates into a UTC timestamp range that includes the last day", () => {
        expect(
            toCreatedRange({ from: Temporal.PlainDate.from("2026-11-01"), to: Temporal.PlainDate.from("2026-11-03") }),
        ).toEqual({
            createdFrom: Temporal.PlainDateTime.from("2026-10-31T17:00:00"),
            createdBefore: Temporal.PlainDateTime.from("2026-11-03T17:00:00"),
        });
        expect(toCreatedRange({})).toEqual({});
    });
});

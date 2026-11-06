import { describe, expect, it } from "vitest";
import { isDueForPreparation, preparationHorizon } from "./slot-preparation.js";

const date = (value: string) => Temporal.PlainDate.from(value);
const time = (value: string) => Temporal.PlainTime.from(value);
const at = (value: string) => Temporal.ZonedDateTime.from(`${value}+07:00[Asia/Jakarta]`);

describe("isDueForPreparation", () => {
    const lunch = [date("2026-11-10"), time("12:00")] as const;

    it.each([
        ["2026-11-10T08:59:59", false],
        ["2026-11-10T09:00:00", true],
        ["2026-11-10T13:00:00", true],
        ["2026-11-09T23:00:00", false],
    ])("at %s is %s with a 3 hour lead", (now, expected) => {
        expect(isDueForPreparation(...lunch, at(now), 180)).toBe(expected);
    });

    it("reaches into the day before for an early meal", () => {
        expect(isDueForPreparation(date("2026-11-10"), time("01:00"), at("2026-11-09T22:00:00"), 180)).toBe(true);
    });
});

describe("preparationHorizon", () => {
    it("is today until the lead crosses midnight", () => {
        expect(preparationHorizon(at("2026-11-09T20:59:00"), 180).toString()).toBe("2026-11-09");
        expect(preparationHorizon(at("2026-11-09T21:00:00"), 180).toString()).toBe("2026-11-10");
    });
});

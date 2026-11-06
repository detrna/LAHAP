import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../shared/errors/validation-error.js";
import {
    compareSlots,
    findUnofferedTimes,
    isOrderable,
    periodRange,
    selectPeriodSlots,
    type SlotCandidate,
} from "./period-slots.js";

const date = (value: string) => Temporal.PlainDate.from(value);
const slot = (id: string, day: string, time: string, overrides: Partial<SlotCandidate> = {}): SlotCandidate => ({
    id,
    packageId: "pkg",
    date: day,
    deliveryTime: { time },
    isPublished: true,
    ...overrides,
});

describe("periodRange", () => {
    it("covers monday to sunday for a weekly order", () => {
        const range = periodRange("Mingguan", date("2026-11-09"));
        expect(range.from.toString()).toBe("2026-11-09");
        expect(range.to.toString()).toBe("2026-11-15");
    });

    it("refuses a weekly order that does not start on a monday", () => {
        expect(() => periodRange("Mingguan", date("2026-11-10"))).toThrow(ValidationError);
    });

    it("covers the whole month for a monthly order", () => {
        const range = periodRange("Bulanan", date("2027-02-01"));
        expect(range.to.toString()).toBe("2027-02-28");
    });

    it("refuses a monthly order that does not start on the first", () => {
        expect(() => periodRange("Bulanan", date("2026-12-02"))).toThrow(ValidationError);
    });
});

describe("findUnofferedTimes", () => {
    it("compares at minute precision", () => {
        expect(findUnofferedTimes(["07:00", "12:00"], ["07:00:00", "18:30"])).toEqual(["12:00"]);
    });
});

describe("isOrderable", () => {
    const context = { packageId: "pkg", today: date("2026-11-09") };

    it("accepts a published slot of the package after today", () => {
        expect(isOrderable(slot("a", "2026-11-10", "07:00"), context)).toBe(true);
    });

    it.each([
        ["today", slot("a", "2026-11-09", "07:00")],
        ["in the past", slot("a", "2026-11-01", "07:00")],
        ["unpublished", slot("a", "2026-11-10", "07:00", { isPublished: false })],
        ["of another package", slot("a", "2026-11-10", "07:00", { packageId: "other" })],
    ])("refuses a slot %s", (_, candidate) => {
        expect(isOrderable(candidate, context)).toBe(false);
    });
});

describe("selectPeriodSlots", () => {
    const candidates = [
        slot("sun-noon", "2026-11-15", "12:00"),
        slot("mon-breakfast", "2026-11-09", "07:00"),
        slot("tue-dinner", "2026-11-10", "18:30"),
        slot("tue-breakfast", "2026-11-10", "07:00"),
        slot("next-mon", "2026-11-16", "07:00"),
        slot("draft", "2026-11-11", "07:00", { isPublished: false }),
    ];
    const range = periodRange("Mingguan", date("2026-11-09"));

    it("takes the published slots in the range at the chosen times, in order", () => {
        const picked = selectPeriodSlots(candidates, {
            packageId: "pkg",
            today: date("2026-11-08"),
            range,
            deliveryTimes: ["07:00", "12:00"],
        });
        expect(picked.map(item => item.id)).toEqual(["mon-breakfast", "tue-breakfast", "sun-noon"]);
    });

    it("drops slots on or before today when the period has started", () => {
        const picked = selectPeriodSlots(candidates, {
            packageId: "pkg",
            today: date("2026-11-10"),
            range,
            deliveryTimes: ["07:00", "18:30"],
        });
        expect(picked.map(item => item.id)).toEqual([]);
    });

    it("keeps the later days of a started week", () => {
        const picked = selectPeriodSlots(candidates, {
            packageId: "pkg",
            today: date("2026-11-12"),
            range,
            deliveryTimes: ["12:00"],
        });
        expect(picked.map(item => item.id)).toEqual(["sun-noon"]);
    });
});

describe("compareSlots", () => {
    it("orders by date, then time", () => {
        const sorted = [
            slot("b", "2026-11-10", "12:00"),
            slot("a", "2026-11-10", "07:00"),
            slot("c", "2026-11-09", "18:00"),
        ]
            .sort(compareSlots)
            .map(item => item.id);
        expect(sorted).toEqual(["c", "a", "b"]);
    });
});

import { describe, expect, it } from "vitest";
import { churnCutoffDate, isChurned } from "./churn.js";

const today = Temporal.PlainDate.from("2026-11-20");

describe("churnCutoffDate", () => {
    it("is 14 days before today", () => {
        expect(churnCutoffDate(today).toString()).toBe("2026-11-06");
    });
});

describe("isChurned", () => {
    it("is false for a customer without a successful order", () => {
        expect(isChurned(null, today)).toBe(false);
    });

    it("is false when the last order ended 14 days ago", () => {
        expect(isChurned(Temporal.PlainDate.from("2026-11-06"), today)).toBe(false);
    });

    it("is true when the last order ended 15 days ago", () => {
        expect(isChurned(Temporal.PlainDate.from("2026-11-05"), today)).toBe(true);
    });

    it("is false while an order is still running", () => {
        expect(isChurned(Temporal.PlainDate.from("2026-11-25"), today)).toBe(false);
    });
});

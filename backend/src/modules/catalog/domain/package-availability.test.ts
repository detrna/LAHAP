import { describe, expect, it } from "vitest";
import { isPackageAvailable, isValidSalesWindow } from "./package-availability.js";

const at = (value: string) => Temporal.PlainDateTime.from(value);
const NOW = at("2026-11-06T03:00:00");

describe("isPackageAvailable", () => {
    it("is available while active and inside an open-ended window", () => {
        expect(isPackageAvailable({ isActive: true, startAt: at("2026-11-01T00:00:00"), endAt: null }, NOW)).toBe(true);
    });

    it("is available from the exact start moment", () => {
        expect(isPackageAvailable({ isActive: true, startAt: NOW, endAt: null }, NOW)).toBe(true);
    });

    it("is not available before the start", () => {
        expect(isPackageAvailable({ isActive: true, startAt: at("2026-11-06T03:00:01"), endAt: null }, NOW)).toBe(
            false,
        );
    });

    it("is not available from the exact end moment", () => {
        expect(isPackageAvailable({ isActive: true, startAt: at("2026-11-01T00:00:00"), endAt: NOW }, NOW)).toBe(false);
    });

    it("is available just before the end", () => {
        expect(
            isPackageAvailable(
                { isActive: true, startAt: at("2026-11-01T00:00:00"), endAt: at("2026-11-06T03:00:01") },
                NOW,
            ),
        ).toBe(true);
    });

    it("is never available while switched off", () => {
        expect(isPackageAvailable({ isActive: false, startAt: at("2026-11-01T00:00:00"), endAt: null }, NOW)).toBe(
            false,
        );
    });
});

describe("isValidSalesWindow", () => {
    it("accepts no end", () => {
        expect(isValidSalesWindow(NOW, null)).toBe(true);
    });

    it("requires the end to be after the start", () => {
        expect(isValidSalesWindow(NOW, at("2026-11-06T03:00:01"))).toBe(true);
        expect(isValidSalesWindow(NOW, NOW)).toBe(false);
        expect(isValidSalesWindow(NOW, at("2026-11-06T02:59:59"))).toBe(false);
    });
});

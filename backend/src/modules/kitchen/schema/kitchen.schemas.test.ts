import { describe, expect, it } from "vitest";
import { toCookQuerySchema } from "./kitchen.schemas.js";

describe("toCookQuerySchema (unit)", () => {
    it("accepts an empty query", () => {
        expect(toCookQuerySchema.parse({})).toEqual({});
    });

    it("parses the dates, the meal time and the package", () => {
        const parsed = toCookQuerySchema.parse({
            from: "2026-11-09",
            to: "2026-11-10",
            deliveryTime: "07:00",
            packageId: "00000000-0000-4000-8000-000000000001",
        });

        expect(parsed.from?.toString()).toBe("2026-11-09");
        expect(parsed.to?.toString()).toBe("2026-11-10");
        expect(parsed.deliveryTime?.toString()).toBe("07:00:00");
        expect(parsed.packageId).toBe("00000000-0000-4000-8000-000000000001");
    });

    it.each([
        ["a bad date", { from: "09-11-2026" }],
        ["an impossible date", { to: "2026-02-30" }],
        ["a bad meal time", { deliveryTime: "7am" }],
        ["a package id that is not a uuid", { packageId: "p-1" }],
    ])("rejects %s", (_, query) => {
        expect(toCookQuerySchema.safeParse(query).success).toBe(false);
    });
});

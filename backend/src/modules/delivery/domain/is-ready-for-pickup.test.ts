import { describe, expect, it } from "vitest";
import { isReadyForPickup } from "./is-ready-for-pickup.js";

describe("isReadyForPickup (unit)", () => {
    it("is true only while the slot is out for delivery", () => {
        expect(isReadyForPickup("Diantar")).toBe(true);
    });

    it.each(["Terjadwal", "Disiapkan", "Siap Diambil", "Selesai", "Dilewati"] as const)("is false for %s", status => {
        expect(isReadyForPickup(status)).toBe(false);
    });
});

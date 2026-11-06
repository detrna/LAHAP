import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, type OrderStatus } from "./order.domain.js";
import { canCorrect, foodReadyStatus, isForwardOnPath, isSkippable, slotPath } from "./slot-status.js";

describe("slotPath", () => {
    it("goes through Diantar for delivery and Siap Diambil for pick-up", () => {
        expect(slotPath(true)).toEqual(["Terjadwal", "Disiapkan", "Diantar", "Selesai"]);
        expect(slotPath(false)).toEqual(["Terjadwal", "Disiapkan", "Siap Diambil", "Selesai"]);
    });
});

describe("foodReadyStatus", () => {
    it("depends on the delivery method", () => {
        expect(foodReadyStatus(true)).toBe("Diantar");
        expect(foodReadyStatus(false)).toBe("Siap Diambil");
    });
});

describe("isSkippable", () => {
    it.each(ORDER_STATUSES.map(status => [status, status === "Terjadwal" || status === "Disiapkan"] as const))(
        "%s is skippable: %s",
        (status, expected) => {
            expect(isSkippable(status)).toBe(expected);
        },
    );
});

describe("isForwardOnPath", () => {
    it("allows any forward step on the slot's path", () => {
        expect(isForwardOnPath(true, "Terjadwal", "Disiapkan")).toBe(true);
        expect(isForwardOnPath(true, "Disiapkan", "Selesai")).toBe(true);
        expect(isForwardOnPath(false, "Siap Diambil", "Selesai")).toBe(true);
    });

    it("refuses going back or staying", () => {
        expect(isForwardOnPath(true, "Diantar", "Disiapkan")).toBe(false);
        expect(isForwardOnPath(true, "Diantar", "Diantar")).toBe(false);
    });

    it("refuses the other path's status", () => {
        expect(isForwardOnPath(true, "Disiapkan", "Siap Diambil")).toBe(false);
        expect(isForwardOnPath(false, "Disiapkan", "Diantar")).toBe(false);
    });

    it("refuses leaving a skipped slot", () => {
        expect(isForwardOnPath(true, "Dilewati", "Selesai")).toBe(false);
    });
});

describe("canCorrect", () => {
    const cases: readonly [boolean, OrderStatus, OrderStatus, boolean][] = [
        [true, "Terjadwal", "Diantar", true],
        [true, "Diantar", "Selesai", true],
        [false, "Disiapkan", "Siap Diambil", true],
        [true, "Selesai", "Diantar", false],
        [true, "Disiapkan", "Terjadwal", false],
        [true, "Terjadwal", "Dilewati", true],
        [false, "Disiapkan", "Dilewati", true],
        [true, "Diantar", "Dilewati", false],
        [false, "Siap Diambil", "Dilewati", false],
        [true, "Selesai", "Dilewati", false],
        [true, "Dilewati", "Dilewati", false],
    ];

    it.each(cases)("delivery %s: %s to %s is %s", (isDelivery, from, to, expected) => {
        expect(canCorrect(isDelivery, from, to)).toBe(expected);
    });
});

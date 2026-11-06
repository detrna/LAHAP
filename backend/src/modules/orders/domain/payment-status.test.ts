import { describe, expect, it } from "vitest";
import { isDoneOnline, toPaidMethod, toStoredPaymentStatus } from "./payment-status.js";

describe("toStoredPaymentStatus", () => {
    it.each([
        ["PAID", "Success"],
        ["PENDING", "Pending"],
        ["CHALLENGE", "Pending"],
        ["FAILED", "Expire"],
        ["EXPIRED", "Expire"],
        ["CANCELED", "Expire"],
        ["REFUNDED", "Refund"],
    ] as const)("maps %s to %s", (gateway, stored) => {
        expect(toStoredPaymentStatus(gateway)).toBe(stored);
    });
});

describe("toPaidMethod", () => {
    it("prefixes the reported channel", () => {
        expect(toPaidMethod("bank_transfer")).toBe("MIDTRANS_BANK_TRANSFER");
        expect(toPaidMethod("qris")).toBe("MIDTRANS_QRIS");
    });

    it("keeps MIDTRANS when no channel is reported", () => {
        expect(toPaidMethod(undefined)).toBe("MIDTRANS");
        expect(toPaidMethod(" ")).toBe("MIDTRANS");
    });
});

describe("isDoneOnline", () => {
    it("is false only for cash", () => {
        expect(isDoneOnline("CASH")).toBe(false);
        expect(isDoneOnline("MIDTRANS")).toBe(true);
        expect(isDoneOnline("MIDTRANS_QRIS")).toBe(true);
        expect(isDoneOnline("FREE")).toBe(true);
    });
});

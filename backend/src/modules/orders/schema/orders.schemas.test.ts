import { describe, expect, it } from "vitest";
import {
    adminMethodChangeListQuerySchema,
    adminPaymentListQuerySchema,
    checkoutSchema,
    deliveryMethodChangeSchema,
    foodReadySchema,
} from "./orders.schemas.js";

const PACKAGE_ID = "10000000-0000-4000-8000-000000000001";
const SLOT_ID = "40000000-0000-4000-8000-000000000001";
const base = { packageId: PACKAGE_ID, purchaseType: "Online", isDelivery: false, recipientName: " Budi " };

describe("checkoutSchema", () => {
    it("parses a daily pick-up order and fills the defaults", () => {
        expect(checkoutSchema.parse({ ...base, period: "Harian", menuScheduleIds: [SLOT_ID], promoCode: " " })).toEqual(
            {
                ...base,
                recipientName: "Budi",
                period: "Harian",
                menuScheduleIds: [SLOT_ID],
                deliveryAddress: null,
                deliveryLatitude: null,
                deliveryLongitude: null,
                notes: null,
                promoCode: null,
                paymentMethod: "MIDTRANS",
            },
        );
    });

    it("parses a weekly order's start date and meal times", () => {
        const parsed = checkoutSchema.parse({
            ...base,
            period: "Mingguan",
            periodStart: "2026-11-09",
            deliveryTimes: ["07:00", "12:00"],
        });
        expect(parsed).toMatchObject({ period: "Mingguan" });
        if (parsed.period === "Harian") throw new Error("expected a range period");
        expect(parsed.periodStart.toString()).toBe("2026-11-09");
        expect(parsed.deliveryTimes.map(time => time.toString())).toEqual(["07:00:00", "12:00:00"]);
    });

    it.each([
        ["no slots", { period: "Harian", menuScheduleIds: [] }],
        ["duplicate slots", { period: "Harian", menuScheduleIds: [SLOT_ID, SLOT_ID] }],
        ["a weekly order without times", { period: "Mingguan", periodStart: "2026-11-09", deliveryTimes: [] }],
        ["duplicate times", { period: "Mingguan", periodStart: "2026-11-09", deliveryTimes: ["07:00", "07:00"] }],
        ["a daily order with a start date only", { period: "Harian", periodStart: "2026-11-09" }],
        ["an unknown period", { period: "Tahunan", menuScheduleIds: [SLOT_ID] }],
        ["half a pin", { period: "Harian", menuScheduleIds: [SLOT_ID], deliveryLatitude: -7.9 }],
        [
            "delivery without an address",
            {
                period: "Harian",
                menuScheduleIds: [SLOT_ID],
                isDelivery: true,
                deliveryLatitude: -7.9,
                deliveryLongitude: 112.6,
            },
        ],
        [
            "delivery without a pin",
            { period: "Harian", menuScheduleIds: [SLOT_ID], isDelivery: true, deliveryAddress: "Jl. Ijen" },
        ],
        ["an empty recipient", { period: "Harian", menuScheduleIds: [SLOT_ID], recipientName: "  " }],
        ["another payment method", { period: "Harian", menuScheduleIds: [SLOT_ID], paymentMethod: "QRIS" }],
    ])("rejects %s", (_, overrides) => {
        expect(checkoutSchema.safeParse({ ...base, ...overrides }).success).toBe(false);
    });

    it("accepts a delivery order with an address and a pin", () => {
        const result = checkoutSchema.safeParse({
            ...base,
            period: "Harian",
            menuScheduleIds: [SLOT_ID],
            isDelivery: true,
            deliveryAddress: "Jl. Ijen",
            deliveryLatitude: -7.9,
            deliveryLongitude: 112.6,
        });
        expect(result.success).toBe(true);
    });
});

describe("foodReadySchema", () => {
    it("accepts a schedule group or explicit slots, but not both", () => {
        expect(foodReadySchema.safeParse({ menuScheduleId: SLOT_ID }).success).toBe(true);
        expect(foodReadySchema.safeParse({ menuScheduleId: SLOT_ID, usesAlternativeMenu: true }).success).toBe(true);
        expect(foodReadySchema.safeParse({ orderIds: [SLOT_ID] }).success).toBe(true);
        expect(foodReadySchema.safeParse({ orderIds: [] }).success).toBe(false);
        expect(foodReadySchema.safeParse({}).success).toBe(false);
        expect(foodReadySchema.safeParse({ menuScheduleId: SLOT_ID, orderIds: [SLOT_ID] }).success).toBe(false);
    });
});

describe("deliveryMethodChangeSchema", () => {
    it("parses a switch to pick-up and fills the defaults", () => {
        expect(deliveryMethodChangeSchema.parse({ isDelivery: false })).toEqual({
            isDelivery: false,
            deliveryAddress: null,
            deliveryLatitude: null,
            deliveryLongitude: null,
            paymentMethod: "MIDTRANS",
        });
    });

    it("parses a switch to delivery from a chosen date", () => {
        const parsed = deliveryMethodChangeSchema.parse({
            isDelivery: true,
            effectiveFrom: "2026-11-12",
            deliveryAddress: " Jl. Ijen ",
            deliveryLatitude: -7.95,
            deliveryLongitude: 112.61,
            paymentMethod: "CASH",
        });

        expect(parsed).toMatchObject({
            effectiveFrom: Temporal.PlainDate.from("2026-11-12"),
            deliveryAddress: "Jl. Ijen",
            paymentMethod: "CASH",
        });
    });

    it("needs an address and a pin for delivery, and both coordinates together", () => {
        const missing = deliveryMethodChangeSchema.safeParse({ isDelivery: true });
        expect(missing.success).toBe(false);
        expect(missing.error?.issues.map(issue => issue.path.join("."))).toEqual([
            "deliveryAddress",
            "deliveryLatitude",
        ]);

        const half = deliveryMethodChangeSchema.safeParse({
            isDelivery: false,
            deliveryLatitude: -7.95,
        });
        expect(half.error?.issues.map(issue => issue.path.join("."))).toEqual(["deliveryLongitude"]);
        expect(deliveryMethodChangeSchema.safeParse({ isDelivery: false, effectiveFrom: "12-11-2026" }).success).toBe(
            false,
        );
    });
});

describe("adminMethodChangeListQuerySchema", () => {
    it("reads the refund filter as a boolean", () => {
        expect(adminMethodChangeListQuerySchema.parse({ needsRefund: "false" })).toMatchObject({ needsRefund: false });
        expect(adminMethodChangeListQuerySchema.parse({})).not.toHaveProperty("needsRefund");
    });
});

describe("adminPaymentListQuerySchema", () => {
    it("filters by payment type", () => {
        expect(adminPaymentListQuerySchema.parse({ type: "DELIVERY_SERVICE_UPGRADE" })).toMatchObject({
            type: "DELIVERY_SERVICE_UPGRADE",
        });
        expect(adminPaymentListQuerySchema.safeParse({ type: "TIP" }).success).toBe(false);
    });
});

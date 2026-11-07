import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../shared/errors/validation-error.js";
import { buildOrderRecord } from "../test-utils/factory/orders.factory.js";
import {
    decideUpgradeOutcome,
    isSwitchable,
    planMethodSwitch,
    quoteDowngrade,
    quoteUpgrade,
    type UpgradeState,
} from "./method-change.js";

const today = Temporal.PlainDate.from("2026-11-10");
const endDate = Temporal.PlainDate.from("2026-11-14");
const slot = (id: string, date: string, overrides: Parameters<typeof buildOrderRecord>[0] = {}) =>
    buildOrderRecord({
        id,
        serviceDate: Temporal.PlainDate.from(date),
        isDelivery: true,
        deliveryFee: 4000,
        ...overrides,
    });

describe("isSwitchable (unit)", () => {
    it("takes Terjadwal slots after today that use the other method", () => {
        expect(isSwitchable(slot("a", "2026-11-11"), false, today)).toBe(true);
        expect(isSwitchable(slot("a", "2026-11-10"), false, today)).toBe(false);
        expect(isSwitchable(slot("a", "2026-11-11", { status: "Disiapkan" }), false, today)).toBe(false);
        expect(isSwitchable(slot("a", "2026-11-11", { status: "Dilewati" }), false, today)).toBe(false);
        expect(isSwitchable(slot("a", "2026-11-11"), true, today)).toBe(false);
    });
});

describe("planMethodSwitch (unit)", () => {
    const orders = [
        slot("past", "2026-11-09", { status: "Selesai" }),
        slot("today", "2026-11-10", { status: "Disiapkan" }),
        slot("skipped", "2026-11-11", { status: "Dilewati" }),
        slot("b", "2026-11-12"),
        slot("c", "2026-11-13"),
        slot("d", "2026-11-14"),
    ];

    it("starts at the first switchable slot when no date is given", () => {
        const plan = planMethodSwitch({ orders, toDelivery: false, today, endDate });

        expect(plan.effectiveFrom).toEqual(Temporal.PlainDate.from("2026-11-12"));
        expect(plan.slots.map(order => order.id)).toEqual(["b", "c", "d"]);
    });

    it("switches the slots on and after the chosen date and leaves skipped ones alone", () => {
        const plan = planMethodSwitch({
            orders,
            toDelivery: false,
            today,
            endDate,
            requested: Temporal.PlainDate.from("2026-11-11"),
        });

        expect(plan.effectiveFrom).toEqual(Temporal.PlainDate.from("2026-11-11"));
        expect(plan.slots.map(order => order.id)).toEqual(["b", "c", "d"]);
        expect(
            planMethodSwitch({
                orders,
                toDelivery: false,
                today,
                endDate,
                requested: Temporal.PlainDate.from("2026-11-13"),
            }).slots.map(order => order.id),
        ).toEqual(["c", "d"]);
    });

    it.each(["2026-11-10", "2026-11-09", "2026-11-15"])("refuses %s as a start date with a 400", date => {
        const attempt = () =>
            planMethodSwitch({ orders, toDelivery: false, today, endDate, requested: Temporal.PlainDate.from(date) });

        expect(attempt).toThrow(ValidationError);
        try {
            attempt();
        } catch (error) {
            expect((error as ValidationError).issues).toEqual([
                expect.objectContaining({ target: "body", path: "effectiveFrom" }),
            ]);
        }
    });

    it("refuses with a 422 when no slot can switch", () => {
        expect(() => planMethodSwitch({ orders, toDelivery: true, today, endDate })).toThrow(
            expect.objectContaining({ statusCode: 422, message: "no slot can switch method" }),
        );
        expect(() =>
            planMethodSwitch({
                orders: [slot("a", "2026-11-12", { status: "Dilewati" })],
                toDelivery: false,
                today,
                endDate,
                requested: Temporal.PlainDate.from("2026-11-12"),
            }),
        ).toThrow(expect.objectContaining({ statusCode: 422 }));
    });
});

describe("quoteDowngrade (unit)", () => {
    it("refunds each slot's own paid fee", () => {
        expect(
            quoteDowngrade([
                slot("a", "2026-11-12", { deliveryFee: 4000 }),
                slot("b", "2026-11-13", { deliveryFee: 2500.5 }),
            ]),
        ).toEqual({
            deliveryFeePerSlot: 0,
            amount: 6500.5,
            slots: [
                { orderId: "a", fee: 4000 },
                { orderId: "b", fee: 2500.5 },
            ],
        });
    });
});

describe("quoteUpgrade (unit)", () => {
    it("charges the fee per slot for every switched slot", () => {
        const pickup = { isDelivery: false, deliveryFee: 0 };
        expect(quoteUpgrade([slot("a", "2026-11-12", pickup), slot("b", "2026-11-13", pickup)], 3000)).toEqual({
            deliveryFeePerSlot: 3000,
            amount: 6000,
            slots: [
                { orderId: "a", fee: 3000 },
                { orderId: "b", fee: 3000 },
            ],
        });
    });
});

describe("decideUpgradeOutcome (unit)", () => {
    const state = (overrides: Partial<UpgradeState> = {}): UpgradeState => ({
        paymentStatus: "Pending",
        changeStatus: "Pending",
        subscriptionStatus: "Success",
        slotsStillSwitchable: true,
        ...overrides,
    });

    it("applies a paid upgrade whose slots can still switch", () => {
        expect(decideUpgradeOutcome(state(), "Success")).toEqual({ kind: "upgrade-paid" });
    });

    it.each([
        ["a slot passed its cut-off", state({ slotsStillSwitchable: false })],
        ["the change already expired", state({ changeStatus: "Expire", paymentStatus: "Expire" })],
        ["the order was cancelled", state({ subscriptionStatus: "Dibatalkan" })],
    ])("keeps the money but doesn't apply when %s", (_, current) => {
        expect(decideUpgradeOutcome(current, "Success")).toEqual({ kind: "upgrade-late-paid" });
    });

    it("ignores a repeated payment", () => {
        expect(decideUpgradeOutcome(state({ paymentStatus: "Success", changeStatus: "Success" }), "Success")).toEqual({
            kind: "none",
        });
    });

    it("expires only a pending payment", () => {
        expect(decideUpgradeOutcome(state(), "Expire")).toEqual({ kind: "upgrade-expired" });
        expect(decideUpgradeOutcome(state({ paymentStatus: "Success" }), "Expire")).toEqual({ kind: "none" });
    });

    it("records a refund of a paid upgrade", () => {
        expect(decideUpgradeOutcome(state({ paymentStatus: "Success", changeStatus: "Success" }), "Refund")).toEqual({
            kind: "upgrade-refunded",
        });
        expect(decideUpgradeOutcome(state(), "Refund")).toEqual({ kind: "none" });
        expect(decideUpgradeOutcome(state(), "Pending")).toEqual({ kind: "none" });
    });
});

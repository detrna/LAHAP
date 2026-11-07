import { describe, expect, it } from "vitest";
import { buildMenu, buildScheduleSummary } from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildDeliveryObstacle } from "../test-utils/factory/delivery.factory.js";
import type { CourierSlot } from "./courier-source.js";
import { toCourierDelivery } from "./to-courier-delivery.js";

const slot = (overrides: Partial<CourierSlot> = {}): CourierSlot => ({
    orderId: "o-1",
    status: "Diantar",
    menuScheduleId: "s-1",
    usesAlternativeMenu: false,
    userId: "u-1",
    recipientName: "Bu Rina",
    deliveryAddress: "Jl. Veteran 1",
    deliveryLatitude: -7.95,
    deliveryLongitude: 112.61,
    notes: "pagar hijau",
    ...overrides,
});

const parts = (overrides: Partial<Parameters<typeof toCourierDelivery>[0]> = {}) => ({
    slot: slot(),
    schedule: buildScheduleSummary({ id: "s-1", date: "2026-11-09", deliveryTime: { time: "12:00", range: "Siang" } }),
    menu: buildMenu({ id: "m-1" }),
    packageName: "Paket Reguler",
    phone: "6281200000009",
    obstacles: [buildDeliveryObstacle({ orderId: "o-1" })],
    ...overrides,
});

describe("toCourierDelivery (unit)", () => {
    it("joins the slot with its schedule, menu, package, customer phone and obstacles", () => {
        const input = parts();

        expect(toCourierDelivery(input)).toEqual({
            orderId: "o-1",
            status: "Diantar",
            date: "2026-11-09",
            deliveryTime: { time: "12:00", range: "Siang" },
            recipientName: "Bu Rina",
            phone: "6281200000009",
            deliveryAddress: "Jl. Veteran 1",
            deliveryLatitude: -7.95,
            deliveryLongitude: 112.61,
            packageName: "Paket Reguler",
            menu: input.menu,
            usesAlternativeMenu: false,
            notes: "pagar hijau",
            isReadyForPickup: true,
            obstacles: input.obstacles,
        });
    });

    it("is not ready for pick-up before the food is out for delivery", () => {
        expect(toCourierDelivery(parts({ slot: slot({ status: "Disiapkan" }) }))?.isReadyForPickup).toBe(false);
    });

    it.each([
        ["address", { deliveryAddress: null }],
        ["latitude", { deliveryLatitude: null }],
        ["longitude", { deliveryLongitude: null }],
    ] as const)("answers null when the delivery %s is missing", (_name, missing) => {
        expect(toCourierDelivery(parts({ slot: slot(missing) }))).toBeNull();
    });
});

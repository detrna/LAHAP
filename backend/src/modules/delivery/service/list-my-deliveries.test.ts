import { describe, expect, it } from "vitest";
import { buildMenu, buildPackage, buildScheduleSummary } from "../../catalog/test-utils/factory/catalog.factory.js";
import type { CourierSlot } from "../domain/courier-source.js";
import { buildUserSummary } from "../../users/test-utils/factory/users.factory.js";
import { setupDeliveryService } from "../test-utils/setup/delivery.setup.js";

const slot = (overrides: Partial<CourierSlot> = {}): CourierSlot => ({
    orderId: "o-1",
    status: "Diantar",
    menuScheduleId: "s-noon",
    usesAlternativeMenu: false,
    userId: "u-1",
    recipientName: "Bu Rina",
    deliveryAddress: "Jl. Veteran 1",
    deliveryLatitude: -7.95,
    deliveryLongitude: 112.61,
    notes: null,
    ...overrides,
});

function arrange() {
    const setup = setupDeliveryService();
    setup.catalog.findSchedules.mockResolvedValue([
        buildScheduleSummary({
            id: "s-noon",
            packageId: "p-1",
            date: "2026-11-03",
            deliveryTime: { time: "12:00", range: "Siang" },
            primaryMenuId: "m-1",
            alternativeMenuId: "m-2",
        }),
        buildScheduleSummary({
            id: "s-morning",
            packageId: "p-1",
            date: "2026-11-03",
            deliveryTime: { time: "07:00", range: "Pagi" },
            primaryMenuId: "m-1",
            alternativeMenuId: null,
        }),
    ]);
    setup.catalog.getMenusByIds.mockResolvedValue([buildMenu({ id: "m-1" }), buildMenu({ id: "m-2" })]);
    setup.catalog.getPackagesByIds.mockResolvedValue([buildPackage({ id: "p-1", name: "Paket Reguler" })]);
    setup.slots.listCourierSlots.mockResolvedValue([
        slot({ orderId: "o-1", recipientName: "Bu Rina", userId: "u-1" }),
        slot({ orderId: "o-2", recipientName: "Pak Andi", userId: "u-2", menuScheduleId: "s-morning" }),
        slot({ orderId: "o-3", recipientName: "Anita", userId: "u-3", usesAlternativeMenu: true }),
    ]);
    setup.users.getSummaries.mockResolvedValue([
        buildUserSummary({ id: "u-1", phone: "6281200000001" }),
        buildUserSummary({ id: "u-2", phone: "6281200000002" }),
        buildUserSummary({ id: "u-3", phone: "6281200000003" }),
        buildUserSummary({ id: "c-1", name: "Budi", phone: "6281299999999", role: "COURIER" }),
    ]);
    return setup;
}

describe("DeliveryService.listMyDeliveries (unit)", () => {
    it("asks for the schedules of today by default and of the given date when sent", async () => {
        const { service, catalog } = arrange();

        await service.listMyDeliveries("c-1");
        await service.listMyDeliveries("c-1", Temporal.PlainDate.from("2026-11-09"));

        expect(catalog.findSchedules).toHaveBeenNthCalledWith(1, {
            from: Temporal.PlainDate.from("2026-11-03"),
            to: Temporal.PlainDate.from("2026-11-03"),
        });
        expect(catalog.findSchedules).toHaveBeenNthCalledWith(2, {
            from: Temporal.PlainDate.from("2026-11-09"),
            to: Temporal.PlainDate.from("2026-11-09"),
        });
    });

    it("answers an empty list without more lookups when the day has no schedules", async () => {
        const { service, catalog, slots } = arrange();
        catalog.findSchedules.mockResolvedValue([]);

        expect(await service.listMyDeliveries("c-1")).toEqual([]);
        expect(slots.listCourierSlots).not.toHaveBeenCalled();
    });

    it("answers an empty list when the courier has no slots that day", async () => {
        const { service, slots, catalog, repository, users } = arrange();
        slots.listCourierSlots.mockResolvedValue([]);

        expect(await service.listMyDeliveries("c-1")).toEqual([]);
        expect(slots.listCourierSlots).toHaveBeenCalledWith({
            courierId: "c-1",
            scheduleIds: ["s-noon", "s-morning"],
        });
        expect(catalog.getMenusByIds).not.toHaveBeenCalled();
        expect(repository.listObstacles).not.toHaveBeenCalled();
        expect(users.getSummaries).not.toHaveBeenCalled();
    });

    it("sorts by meal time and then by recipient name, and serves the alternative menu when the slot uses it", async () => {
        const { service } = arrange();

        const deliveries = await service.listMyDeliveries("c-1");

        expect(deliveries.map(item => [item.deliveryTime.time, item.recipientName, item.menu.id])).toEqual([
            ["07:00", "Pak Andi", "m-1"],
            ["12:00", "Anita", "m-2"],
            ["12:00", "Bu Rina", "m-1"],
        ]);
    });

    it("fills the phone, package name and ready-for-pick-up flag", async () => {
        const { service } = arrange();

        const [first] = await service.listMyDeliveries("c-1");

        expect(first).toMatchObject({
            orderId: "o-2",
            phone: "6281200000002",
            packageName: "Paket Reguler",
            date: "2026-11-03",
            isReadyForPickup: true,
        });
    });

    it("attaches each slot's obstacles with the author and a signed photo", async () => {
        const { service, repository, objectStorage } = arrange();
        repository.listObstacles.mockResolvedValue([
            {
                id: "ob-1",
                orderId: "o-1",
                authorId: "c-1",
                note: "Gerbang terkunci",
                photoKey: "obstacles/2026/11/a.webp",
                createdAt: Temporal.PlainDateTime.from("2026-11-03T05:00:00"),
            },
        ]);

        const deliveries = await service.listMyDeliveries("c-1");

        expect(repository.listObstacles).toHaveBeenCalledWith(["o-1", "o-2", "o-3"]);
        expect(objectStorage.getSignedUrl).toHaveBeenCalledTimes(1);
        const withObstacle = deliveries.find(item => item.orderId === "o-1");
        expect(withObstacle?.obstacles).toEqual([
            expect.objectContaining({
                id: "ob-1",
                note: "Gerbang terkunci",
                photoUrl: "https://storage.test/obstacles/2026/11/a.webp?signed",
                createdAt: "2026-11-03T12:00:00.000+07:00",
                author: expect.objectContaining({ id: "c-1", name: "Budi" }),
            }),
        ]);
        expect(deliveries.filter(item => item.orderId !== "o-1").every(item => item.obstacles.length === 0)).toBe(true);
    });

    it("looks up the customers and the obstacle authors in one call", async () => {
        const { service, repository, users } = arrange();
        repository.listObstacles.mockResolvedValue([
            {
                id: "ob-1",
                orderId: "o-1",
                authorId: "c-1",
                note: "x",
                photoKey: null,
                createdAt: Temporal.PlainDateTime.from("2026-11-03T05:00:00"),
            },
        ]);

        await service.listMyDeliveries("c-1");

        expect(users.getSummaries).toHaveBeenCalledTimes(1);
        expect([...users.getSummaries.mock.calls[0]![0]].sort()).toEqual(["c-1", "u-1", "u-2", "u-3"]);
    });

    it("leaves out a slot that cannot be shown and logs it", async () => {
        const { service, slots, logger } = arrange();
        slots.listCourierSlots.mockResolvedValue([
            slot({ orderId: "o-1" }),
            slot({ orderId: "o-bad", deliveryAddress: null }),
            slot({ orderId: "o-nomenu", menuScheduleId: "s-morning", usesAlternativeMenu: true }),
            slot({ orderId: "o-nocustomer", userId: "u-unknown" }),
        ]);

        const deliveries = await service.listMyDeliveries("c-1");

        expect(deliveries.map(item => item.orderId)).toEqual(["o-1"]);
        expect(logger.warn).toHaveBeenCalledTimes(3);
        expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ orderId: "o-bad" }), expect.any(String));
    });
});

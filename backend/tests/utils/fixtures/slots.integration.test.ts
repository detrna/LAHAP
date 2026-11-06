import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../src/infrastructure/database/prisma/db.js";
import { createTestMenu, createTestSchedule } from "./schedules.js";
import { createTestSlots } from "./slots.js";
import { createTestPackage, TEST_DELIVERY_POINT } from "./subscriptions.js";
import { createTestUser } from "./users.js";

describe("createTestSlots (integration)", () => {
    let db: Db;
    let rows: CreatedRows;
    let userId: string;
    let packageId: string;
    let otherPackageId: string;
    const schedules: Record<string, string> = {};

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        userId = await createTestUser(db, rows);
        packageId = await createTestPackage(db, rows);
        otherPackageId = await createTestPackage(db, rows);
        const primaryMenuId = await createTestMenu(db, rows);
        const alternativeMenuId = await createTestMenu(db, rows, { isAlternative: true });
        for (const day of ["2099-04-01", "2099-04-02", "2099-04-03", "2099-04-04", "2099-04-05", "2099-04-06"]) {
            schedules[day] = await createTestSchedule(db, rows, {
                packageId,
                date: day,
                isPublished: true,
                primaryMenuId,
                alternativeMenuId,
            });
        }
        schedules.other = await createTestSchedule(db, rows, { packageId: otherPackageId, date: "2099-04-01" });
    });

    afterAll(async () => {
        await rows?.cleanup();
        await db?.close();
    });

    const schedule = (key: string) => schedules[key] ?? "";

    it("derives the dates and a price snapshot that adds up", async () => {
        const { subscriptionId, slotIds, paymentId } = await createTestSlots(db, rows, {
            userId,
            packageId,
            status: "Success",
            isDelivery: true,
            tierDiscount: 1500,
            promoDiscount: 2000,
            slots: [
                { scheduleId: schedule("2099-04-03"), status: "Diantar" },
                { scheduleId: schedule("2099-04-01"), status: "Dilewati", skipReason: "sick" },
                { scheduleId: schedule("2099-04-02"), usesAlternativeMenu: true },
            ],
        });

        const row = await db.orm.public.Subscription.where({ id: subscriptionId }).first();
        expect(row?.startDate.toString()).toBe("2099-04-01");
        expect(row?.endDate.toString()).toBe("2099-04-03");
        expect(row).toMatchObject({
            foodSubtotal: "45000.00",
            tierDiscount: "1500.00",
            promoDiscount: "2000.00",
            deliveryFeePerSlot: "5000.00",
            deliveryFeeTotal: "15000.00",
            totalPrice: "56500.00",
            deliveryAddress: TEST_DELIVERY_POINT.address,
            deliveryDistanceKm: TEST_DELIVERY_POINT.distanceKm,
        });
        const slots = await Promise.all(slotIds.map(id => db.orm.public.Order.where({ id }).first()));
        expect(slots.map(slot => [slot?.status, slot?.usesAlternativeMenu, slot?.skipReason])).toEqual([
            ["Diantar", false, null],
            ["Dilewati", false, "sick"],
            ["Terjadwal", true, null],
        ]);
        expect(paymentId).toBeNull();
        expect(await db.orm.public.OrderStatusHistory.where({ orderId: slotIds[0] ?? "" }).first()).toBeNull();
    });

    it("leaves the delivery point and fee empty for a pick-up order", async () => {
        const { subscriptionId } = await createTestSlots(db, rows, {
            userId,
            packageId,
            status: "Pending",
            slots: [{ scheduleId: schedule("2099-04-04") }],
        });

        expect(await db.orm.public.Subscription.where({ id: subscriptionId }).first()).toMatchObject({
            deliveryAddress: null,
            deliveryLatitude: null,
            deliveryDistanceKm: null,
            deliveryFeeTotal: "0.00",
            totalPrice: "15000.00",
        });
    });

    it("creates a payment for the total when asked", async () => {
        const { subscriptionId, paymentId } = await createTestSlots(db, rows, {
            userId,
            packageId,
            status: "Success",
            payment: { method: "CASH" },
            slots: [{ scheduleId: schedule("2099-04-05") }],
        });

        expect(await db.orm.public.Payment.where({ id: paymentId ?? "" }).first()).toMatchObject({
            subscriptionId,
            userId,
            method: "CASH",
            type: "SUBSCRIPTION",
            status: "Success",
            amount: "15000.00",
        });
    });

    it("refuses slots the app could never produce", async () => {
        const attempt = (slots: Parameters<typeof createTestSlots>[2]["slots"], isDelivery = false) =>
            createTestSlots(db, rows, { userId, packageId, status: "Success", isDelivery, slots });
        const day = schedule("2099-04-06");

        await expect(attempt([])).rejects.toThrow("at least one slot");
        await expect(attempt([{ scheduleId: day, skipReason: "x" }])).rejects.toThrow("skip reason");
        await expect(attempt([{ scheduleId: day, status: "Diantar" }])).rejects.toThrow("pick-up");
        await expect(attempt([{ scheduleId: day, status: "Siap Diambil" }], true)).rejects.toThrow("delivered");
        await expect(attempt([{ scheduleId: day }, { scheduleId: day }])).rejects.toThrow("its own schedule");
        await expect(attempt([{ scheduleId: randomUUID() }])).rejects.toThrow("unknown schedule");
        await expect(attempt([{ scheduleId: schedule("other") }])).rejects.toThrow("another package");
        await expect(
            createTestSlots(db, rows, {
                userId,
                packageId,
                status: "Success",
                deliveryFeePerSlot: 5000,
                slots: [{ scheduleId: day }],
            }),
        ).rejects.toThrow("no delivery fee");
        expect(await db.orm.public.Order.where({ menuScheduleId: day }).first()).toBeNull();
    });

    it("cleans up every row it created, payments and slots included", async () => {
        const local = trackCreated(db);
        const ownPackageId = await createTestPackage(db, local);
        const ownScheduleId = await createTestSchedule(db, local, {
            packageId: ownPackageId,
            date: "2099-04-07",
            primaryMenuId: await createTestMenu(db, local),
        });
        const { subscriptionId, slotIds, paymentId } = await createTestSlots(db, local, {
            userId,
            packageId: ownPackageId,
            status: "Success",
            payment: {},
            slots: [{ scheduleId: ownScheduleId }],
        });

        await local.cleanup();

        expect(await db.orm.public.Subscription.where({ id: subscriptionId }).first()).toBeNull();
        expect(await db.orm.public.Order.where({ id: slotIds[0] ?? "" }).first()).toBeNull();
        expect(await db.orm.public.Payment.where({ id: paymentId ?? "" }).first()).toBeNull();
        expect(await db.orm.public.Schedule.where({ id: ownScheduleId }).first()).toBeNull();
        expect(await db.orm.public.Package.where({ id: ownPackageId }).first()).toBeNull();
    });
});

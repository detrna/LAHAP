import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestMenu, createTestSchedule } from "../../../../../../tests/utils/fixtures/schedules.js";
import { createTestSlots } from "../../../../../../tests/utils/fixtures/slots.js";
import { createTestPackage } from "../../../../../../tests/utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../../../../tests/utils/fixtures/users.js";
import { loadConfig } from "../../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../../infrastructure/database/prisma/db.js";
import { PrismaOrdersRepository } from "../orders-repository.js";

describe("PrismaOrdersRepository reports (integration)", () => {
    let db: Db;
    let repository: PrismaOrdersRepository;
    let rows: CreatedRows;
    let packageId: string;
    let scheduleId: string;
    let otherScheduleId: string;
    const date = Temporal.PlainDate.from("2995-07-07");
    const createdAt = Temporal.PlainDateTime.from("2995-07-01T05:00:00");

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaOrdersRepository(db);
        rows = trackCreated(db);
        packageId = await createTestPackage(db, rows, { basePrice: 15000 });
        const menuId = await createTestMenu(db, rows);
        scheduleId = await createTestSchedule(db, rows, { packageId, date, isPublished: true, primaryMenuId: menuId });
        otherScheduleId = await createTestSchedule(db, rows, {
            packageId,
            date,
            deliveryTime: "12:00",
            isPublished: true,
            primaryMenuId: menuId,
        });
        const userId = await createTestUser(db, rows);
        const orders = [
            {
                status: "Success" as const,
                purchaseType: "Online" as const,
                slots: [{ scheduleId }, { scheduleId: otherScheduleId, usesAlternativeMenu: true }],
            },
            {
                status: "Success" as const,
                purchaseType: "Offline" as const,
                slots: [{ scheduleId, status: "Dilewati" as const, skipReason: "x" }],
            },
            { status: "Pending" as const, purchaseType: "Online" as const, slots: [{ scheduleId }] },
        ];
        for (const order of orders) {
            const created = await createTestSlots(db, rows, { userId, packageId, ...order });
            await db.orm.public.Subscription.where({ id: created.subscriptionId }).update({ createdAt });
        }
    });

    afterAll(async () => {
        await rows?.cleanup();
        await db?.close();
    });

    it("counts paid portions per schedule and menu choice, leaving skipped slots out", async () => {
        const counts = await repository.countPortions({
            menuScheduleIds: [scheduleId, otherScheduleId],
            statuses: ["Terjadwal", "Disiapkan", "Diantar", "Siap Diambil", "Selesai"],
            subscriptionStatuses: ["Success"],
        });

        expect([...counts].sort((a, b) => a.menuScheduleId.localeCompare(b.menuScheduleId))).toEqual(
            [
                { menuScheduleId: scheduleId, usesAlternativeMenu: false, portions: 1 },
                { menuScheduleId: otherScheduleId, usesAlternativeMenu: true, portions: 1 },
            ].sort((a, b) => a.menuScheduleId.localeCompare(b.menuScheduleId)),
        );
        const byDate = await repository.countPortions({
            serviceDateFrom: date,
            serviceDateTo: date,
            statuses: ["Terjadwal"],
            subscriptionStatuses: ["Success"],
        });
        expect(byDate.reduce((sum, count) => sum + count.portions, 0)).toBeGreaterThanOrEqual(2);
    });

    it("sums the snapshots of paid orders created in the range, skipped slots included", async () => {
        const income = await repository.sumIncome({
            createdFrom: Temporal.PlainDateTime.from("2995-07-01T00:00:00"),
            createdBefore: Temporal.PlainDateTime.from("2995-07-02T00:00:00"),
            statuses: ["Success"],
        });

        expect(income.byPackage).toEqual([
            expect.objectContaining({ packageId, orderCount: 2, foodRevenue: 45000, totalRevenue: 45000 }),
        ]);
        expect([...income.byPurchaseType].sort((a, b) => a.purchaseType.localeCompare(b.purchaseType))).toEqual([
            expect.objectContaining({ purchaseType: "Offline", orderCount: 1, foodRevenue: 15000 }),
            expect.objectContaining({ purchaseType: "Online", orderCount: 1, foodRevenue: 30000 }),
        ]);
    });
});

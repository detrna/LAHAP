import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestMenu, createTestSchedule } from "../../../../../../tests/utils/fixtures/schedules.js";
import { createTestSlots, type TestSlotInput } from "../../../../../../tests/utils/fixtures/slots.js";
import { createTestPackage } from "../../../../../../tests/utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../../../../tests/utils/fixtures/users.js";
import { loadConfig } from "../../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../../infrastructure/database/prisma/db.js";
import type { SubscriptionStatus } from "../../../domain/subscription.domain.js";
import { PrismaOrdersRepository } from "../orders-repository.js";

describe("PrismaOrdersRepository slots (integration)", () => {
    let db: Db;
    let repository: PrismaOrdersRepository;
    let rows: CreatedRows;
    let packageId: string;
    let menuId: string;
    let day = 0;
    const base = Temporal.PlainDate.from("2996-05-04");

    const scheduleOn = (date: Temporal.PlainDate) =>
        createTestSchedule(db, rows, {
            packageId,
            date,
            deliveryTime: `${String(7 + (day++ % 12)).padStart(2, "0")}:00`,
            isPublished: true,
            primaryMenuId: menuId,
        });

    const order = async (
        userId: string,
        status: SubscriptionStatus,
        dates: readonly Temporal.PlainDate[],
        slot: Partial<TestSlotInput> = {},
    ) => {
        const slots: TestSlotInput[] = [];
        for (const date of dates) slots.push({ scheduleId: await scheduleOn(date), ...slot });
        return createTestSlots(db, rows, { userId, packageId, status, slots, payment: { status: "Success" } });
    };

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaOrdersRepository(db);
        rows = trackCreated(db);
        packageId = await createTestPackage(db, rows);
        menuId = await createTestMenu(db, rows);
    });

    afterAll(async () => {
        await rows?.cleanup();
        await db?.close();
    });

    it("moves only slots in an allowed status and writes one history row each", async () => {
        const userId = await createTestUser(db, rows);
        const actorId = await createTestUser(db, rows);
        const created = await order(userId, "Success", [base, base.add({ days: 1 })]);
        const [first, second] = created.slotIds;
        await db.orm.public.Order.where({ id: second! }).update({ status: "Selesai" });

        const changed = await repository.transitionSlots({
            orderIds: [first!, second!],
            from: ["Terjadwal", "Disiapkan"],
            to: "Dilewati",
            actorId,
            skipReason: "mudik",
        });

        expect(changed.map(change => [change.order.id, change.fromStatus, change.order.status])).toEqual([
            [first, "Terjadwal", "Dilewati"],
        ]);
        expect(changed[0]?.order.skipReason).toBe("mudik");
        const history = await db.orm.public.OrderStatusHistory.where({ orderId: first! }).all();
        expect(history).toEqual([
            expect.objectContaining({ fromStatus: "Terjadwal", toStatus: "Dilewati", changedById: actorId }),
        ]);
        expect(
            await repository.transitionSlots({ orderIds: [], from: ["Terjadwal"], to: "Disiapkan", actorId }),
        ).toEqual([]);
    });

    it("lets only one of two concurrent transitions move a slot", async () => {
        const userId = await createTestUser(db, rows);
        const created = await order(userId, "Success", [base.add({ days: 2 })]);
        const move = () =>
            repository.transitionSlots({
                orderIds: created.slotIds,
                from: ["Terjadwal"],
                to: "Disiapkan",
                actorId: null,
            });

        const results = await Promise.all([move(), move()]);

        expect(results.map(result => result.length).sort()).toEqual([0, 1]);
        expect(await db.orm.public.OrderStatusHistory.where({ orderId: created.slotIds[0]! }).all()).toHaveLength(1);
    });

    it("finds a customer's paid slots on a date, and when slots were completed", async () => {
        const userId = await createTestUser(db, rows);
        const date = base.add({ days: 3 });
        const paid = await order(userId, "Success", [date, date.add({ days: 1 })]);
        await order(userId, "Pending", [date]);
        await order(await createTestUser(db, rows), "Success", [date]);

        const slots = await repository.findCustomerSlots({ userId, date, subscriptionStatuses: ["Success"] });

        expect(slots.map(slot => slot.order.id)).toEqual([paid.slotIds[0]]);
        expect(slots[0]?.subscription.id).toBe(paid.subscriptionId);
        expect(
            await repository.findCustomerSlots({
                userId,
                date,
                subscriptionId: randomUUID(),
                subscriptionStatuses: ["Success"],
            }),
        ).toEqual([]);

        const [completed] = await repository.transitionSlots({
            orderIds: [paid.slotIds[0]!],
            from: ["Terjadwal"],
            to: "Selesai",
            actorId: null,
        });
        const times = await repository.findCompletionTimes([paid.slotIds[0]!, paid.slotIds[1]!]);
        expect(times.get(paid.slotIds[0]!)).toEqual(completed?.changedAt);
        expect(times.has(paid.slotIds[1]!)).toBe(false);
        expect(await repository.findSlotWithSubscription(paid.slotIds[1]!)).toMatchObject({
            subscription: { id: paid.subscriptionId },
        });
        expect(await repository.findSlotWithSubscription(randomUUID())).toBeNull();
    });

    it("cancels a subscription only from the expected status", async () => {
        const userId = await createTestUser(db, rows);
        const pending = await createTestSlots(db, rows, {
            userId,
            packageId,
            status: "Pending",
            slots: [{ scheduleId: await scheduleOn(base.add({ days: 6 })) }],
            payment: { status: "Pending" },
        });

        const cancelled = await repository.cancelSubscription({
            subscriptionId: pending.subscriptionId,
            expectedStatus: "Pending",
            needsRefund: false,
            expirePendingPayments: true,
        });

        expect(cancelled).toMatchObject({ status: "Dibatalkan", needsRefund: false });
        expect((await db.orm.public.Payment.where({ id: pending.paymentId! }).first())?.status).toBe("Expire");
        expect(
            await repository.cancelSubscription({
                subscriptionId: pending.subscriptionId,
                expectedStatus: "Pending",
                needsRefund: false,
                expirePendingPayments: true,
            }),
        ).toBeNull();
    });

    it("lists a customer's subscriptions and payments, newest first", async () => {
        const userId = await createTestUser(db, rows);
        const older = await order(userId, "Success", [base.add({ days: 8 })]);
        const newer = await order(userId, "Pending", [base.add({ days: 9 })]);
        await db.orm.public.Subscription.where({ id: older.subscriptionId }).update({
            createdAt: Temporal.PlainDateTime.from("2000-01-01T00:00:00"),
        });

        const all = await repository.listSubscriptions({ userId, skip: 0, take: 10 });
        expect(all.total).toBe(2);
        expect(all.items.map(item => item.id)).toEqual([newer.subscriptionId, older.subscriptionId]);
        const paid = await repository.listSubscriptions({ userId, status: "Success", skip: 0, take: 10 });
        expect(paid.items.map(item => item.id)).toEqual([older.subscriptionId]);
        const page = await repository.listPayments({ userId, skip: 1, take: 1 });
        expect(page.total).toBe(2);
        expect(page.items).toHaveLength(1);
        expect(await repository.findOrdersBySubscriptionId(older.subscriptionId)).toHaveLength(1);
    });

    it("lists a day's paid slots with the admin filters and the status history", async () => {
        const userId = await createTestUser(db, rows);
        const courierId = await createTestUser(db, rows, { role: "COURIER" });
        const date = base.add({ days: 20 });
        const delivered = await createTestSlots(db, rows, {
            userId,
            packageId,
            status: "Success",
            isDelivery: true,
            slots: [{ scheduleId: await scheduleOn(date), courierId }, { scheduleId: await scheduleOn(date) }],
        });
        const pickedUp = await order(userId, "Success", [date]);
        await order(userId, "Pending", [date]);

        const all = await repository.listSlots({ date, skip: 0, take: 10, subscriptionStatuses: ["Success"] });
        const own = all.items.filter(item => item.subscription.userId === userId);
        expect(own).toHaveLength(3);

        const unassigned = await repository.listSlots({
            date,
            isDelivery: true,
            unassigned: true,
            subscriptionId: delivered.subscriptionId,
            skip: 0,
            take: 10,
            subscriptionStatuses: ["Success"],
        });
        expect(unassigned.items.map(item => item.order.id)).toEqual([delivered.slotIds[1]]);
        const assigned = await repository.listSlots({
            date,
            courierId,
            skip: 0,
            take: 10,
            subscriptionStatuses: ["Success"],
        });
        expect(assigned.items.map(item => item.order.id)).toEqual([delivered.slotIds[0]]);
        const pickup = await repository.listSlots({
            date,
            isDelivery: false,
            subscriptionId: pickedUp.subscriptionId,
            skip: 0,
            take: 10,
            subscriptionStatuses: ["Success"],
        });
        expect(pickup.total).toBe(1);

        await repository.transitionSlots({
            orderIds: [delivered.slotIds[0]!],
            from: ["Terjadwal"],
            to: "Disiapkan",
            actorId: courierId,
            adminNote: "catatan",
        });
        expect(await repository.findStatusHistory(delivered.slotIds[0]!)).toEqual([
            expect.objectContaining({ fromStatus: "Terjadwal", toStatus: "Disiapkan", adminNote: "catatan" }),
        ]);
        const refunds = await repository.listPayments({ userId, needsRefund: true, skip: 0, take: 10 });
        expect(refunds.total).toBe(0);
    });
});

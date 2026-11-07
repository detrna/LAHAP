import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestMenu, createTestSchedule } from "../../../../../../tests/utils/fixtures/schedules.js";
import { createTestSlots, type TestSlotsInput } from "../../../../../../tests/utils/fixtures/slots.js";
import { createTestPackage } from "../../../../../../tests/utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../../../../tests/utils/fixtures/users.js";
import { loadConfig } from "../../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../../infrastructure/database/prisma/db.js";
import { InvalidStateError } from "../../../../../shared/errors/invalid-state-error.js";
import type {
    MethodChangeWrite,
    NewDeliveryMethodChangeRecord,
} from "../../../service/interfaces/orders.repository.js";
import { PrismaOrdersRepository } from "../orders-repository.js";

describe("PrismaOrdersRepository delivery method changes (integration)", () => {
    let db: Db;
    let repository: PrismaOrdersRepository;
    let rows: CreatedRows;
    let packageId: string;
    let menuId: string;
    let day = 0;
    const base = Temporal.PlainDate.from("2995-02-06");

    const paidOrder = async (input: Partial<TestSlotsInput> & { readonly userId: string }, count = 3) => {
        const scheduleIds: string[] = [];
        for (let index = 0; index < count; index++) {
            scheduleIds.push(
                await createTestSchedule(db, rows, {
                    packageId,
                    date: base.add({ days: day++ }),
                    isPublished: true,
                    primaryMenuId: menuId,
                }),
            );
        }
        return createTestSlots(db, rows, {
            packageId,
            status: "Success",
            payment: { status: "Success" },
            slots: scheduleIds.map(scheduleId => ({ scheduleId })),
            ...input,
        });
    };

    const changeOf = (
        subscriptionId: string,
        requestedById: string,
        overrides: Partial<NewDeliveryMethodChangeRecord> = {},
    ): NewDeliveryMethodChangeRecord => ({
        id: randomUUID(),
        subscriptionId,
        requestedById,
        toDelivery: false,
        effectiveFrom: base,
        status: "Success",
        slotCount: 2,
        deliveryFeePerSlot: 0,
        amount: 8000,
        needsRefund: true,
        deliveryAddress: null,
        deliveryLatitude: null,
        deliveryLongitude: null,
        deliveryDistanceKm: null,
        ...overrides,
    });

    const create = async (write: MethodChangeWrite) => {
        if (write.payment !== null) rows.track("Payment", write.payment.id);
        rows.track("DeliveryMethodChange", write.change.id);
        return repository.createMethodChange(write);
    };

    const readOrders = (ids: readonly string[]) =>
        db.orm.public.Order.where(row => row.id.in([...ids] as Varchar<36>[]))
            .orderBy(row => row.serviceDate.asc())
            .all();

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

    describe("createMethodChange", () => {
        it("switches the slots to pick-up at once and records what to refund", async () => {
            const userId = await createTestUser(db, rows);
            const courierId = await createTestUser(db, rows, { role: "COURIER" });
            const order = await paidOrder({ userId, isDelivery: true, deliveryFeePerSlot: 4000 });
            await db.orm.public.Order.where(row => row.id.in([...order.slotIds] as Varchar<36>[])).updateAll({
                courierId,
            });
            const [, second, third] = order.slotIds;

            const result = await create({
                change: changeOf(order.subscriptionId, userId),
                slots: [
                    { orderId: second!, fee: 4000 },
                    { orderId: third!, fee: 4000 },
                ],
                payment: null,
                apply: true,
            });

            expect(result.change).toMatchObject({ status: "Success", needsRefund: true, amount: 8000, slotCount: 2 });
            expect(result.change.slots.map(slot => [slot.orderId, slot.fee])).toEqual([
                [second, 4000],
                [third, 4000],
            ]);
            expect(result.change.slots[0]!.serviceDate).toEqual(base.add({ days: day - 2 }));
            expect(result.slotsBefore.map(slot => slot.courierId)).toEqual([courierId, courierId]);
            expect(result.subscription.isDelivery).toBe(false);
            expect(result.payment).toBeNull();
            const orders = await readOrders(order.slotIds);
            expect(orders.map(row => [row.isDelivery, row.deliveryFee, row.courierId])).toEqual([
                [true, "4000.00", courierId],
                [false, "0.00", null],
                [false, "0.00", null],
            ]);
        });

        it("opens an upgrade with its payment and leaves the slots until it is paid", async () => {
            const userId = await createTestUser(db, rows);
            const order = await paidOrder({ userId }, 2);
            const paymentId = randomUUID();

            const result = await create({
                change: changeOf(order.subscriptionId, userId, {
                    toDelivery: true,
                    status: "Pending",
                    deliveryFeePerSlot: 3000,
                    amount: 6000,
                    needsRefund: false,
                    deliveryAddress: "Jl. Ijen",
                    deliveryLatitude: -7.95218912,
                    deliveryLongitude: 112.61287634,
                    deliveryDistanceKm: 5,
                }),
                slots: order.slotIds.map(orderId => ({ orderId, fee: 3000 })),
                payment: { id: paymentId, method: "MIDTRANS", amount: 6000, status: "Pending", paidAt: null },
                apply: false,
            });

            expect(result.payment).toMatchObject({
                id: paymentId,
                type: "DELIVERY_SERVICE_UPGRADE",
                status: "Pending",
                amount: 6000,
                subscriptionId: order.subscriptionId,
                userId,
            });
            expect(result.change).toMatchObject({ paymentId, status: "Pending", deliveryLatitude: -7.95218912 });
            expect((await readOrders(order.slotIds)).every(row => !row.isDelivery)).toBe(true);
            expect(result.subscription.isDelivery).toBe(false);
            const upgrades = await repository.listPayments({
                userId,
                type: "DELIVERY_SERVICE_UPGRADE",
                skip: 0,
                take: 10,
            });
            expect(upgrades.items.map(item => item.id)).toEqual([paymentId]);
        });

        it("refuses slots that moved on, and a second change while one waits for payment", async () => {
            const userId = await createTestUser(db, rows);
            const order = await paidOrder({ userId, isDelivery: true }, 2);
            await db.orm.public.Order.where({ id: order.slotIds[0]! }).update({ status: "Disiapkan" });

            await expect(
                create({
                    change: changeOf(order.subscriptionId, userId),
                    slots: order.slotIds.map(orderId => ({ orderId, fee: 5000 })),
                    payment: null,
                    apply: true,
                }),
            ).rejects.toThrow(new InvalidStateError("slots changed, try again"));
            expect((await readOrders(order.slotIds)).every(row => row.isDelivery)).toBe(true);

            const pickup = await paidOrder({ userId }, 1);
            const pending = {
                change: changeOf(pickup.subscriptionId, userId, { toDelivery: true, status: "Pending", slotCount: 1 }),
                slots: [{ orderId: pickup.slotIds[0]!, fee: 3000 }],
                payment: {
                    id: randomUUID(),
                    method: "MIDTRANS" as const,
                    amount: 3000,
                    status: "Pending" as const,
                    paidAt: null,
                },
                apply: false,
            };
            await create(pending);
            await expect(
                create({ ...pending, change: { ...pending.change, id: randomUUID() }, payment: null }),
            ).rejects.toThrow(new InvalidStateError("another delivery method change is waiting for payment"));
        });

        it("refuses an order that isn't paid", async () => {
            const userId = await createTestUser(db, rows);
            const order = await paidOrder({ userId, status: "Pending", payment: { status: "Pending" } }, 1);

            await expect(
                create({
                    change: changeOf(order.subscriptionId, userId, { slotCount: 1 }),
                    slots: [{ orderId: order.slotIds[0]!, fee: 0 }],
                    payment: null,
                    apply: true,
                }),
            ).rejects.toThrow(new InvalidStateError("subscription is not paid"));
        });
    });

    describe("payments of an upgrade", () => {
        const openUpgrade = async () => {
            const userId = await createTestUser(db, rows);
            const order = await paidOrder({ userId }, 2);
            const paymentId = randomUUID();
            const result = await create({
                change: changeOf(order.subscriptionId, userId, {
                    toDelivery: true,
                    status: "Pending",
                    deliveryFeePerSlot: 3000,
                    amount: 6000,
                    needsRefund: false,
                    deliveryAddress: "Jl. Ijen",
                    deliveryLatitude: -7.95218912,
                    deliveryLongitude: 112.61287634,
                    deliveryDistanceKm: 5,
                }),
                slots: order.slotIds.map(orderId => ({ orderId, fee: 3000 })),
                payment: { id: paymentId, method: "MIDTRANS", amount: 6000, status: "Pending", paidAt: null },
                apply: false,
            });
            return { order, paymentId, change: result.change };
        };

        it("hands the change, its slots and the other payments to the decision, and applies a paid upgrade", async () => {
            const { order, paymentId, change } = await openUpgrade();
            const paidAt = Temporal.PlainDateTime.from("2026-11-06T03:00:00");

            const result = await repository.changePayment(paymentId, current => {
                expect(current.methodChange?.change.id).toBe(change.id);
                expect(current.methodChange?.orders.map(row => row.id).sort()).toEqual([...order.slotIds].sort());
                expect(current.otherPayments?.map(payment => payment.id)).toEqual([order.paymentId]);
                return {
                    payment: { status: "Success", paidAt },
                    methodChange: { status: "Success", apply: true },
                };
            });

            expect(result?.after?.methodChange?.change.status).toBe("Success");
            expect(result?.after?.subscription).toMatchObject({
                isDelivery: true,
                deliveryAddress: "Jl. Ijen",
                deliveryDistanceKm: 5,
                status: "Success",
            });
            const orders = await readOrders(order.slotIds);
            expect(orders.map(row => [row.isDelivery, row.deliveryFee])).toEqual([
                [true, "3000.00"],
                [true, "3000.00"],
            ]);
        });

        it("gives a subscription payment no change but its sibling payments", async () => {
            const userId = await createTestUser(db, rows);
            const order = await paidOrder({ userId }, 1);

            const result = await repository.changePayment(order.paymentId!, current => {
                expect(current.methodChange).toBeUndefined();
                expect(current.otherPayments).toEqual([]);
                return null;
            });

            expect(result?.after).toBeNull();
        });

        it("expires the change together with its payment and keeps the order paid", async () => {
            const { order, paymentId, change } = await openUpgrade();
            await db.orm.public.Payment.where({ id: paymentId }).update({
                createdAt: Temporal.PlainDateTime.from("2000-01-01T00:00:00"),
            });

            const expired = await repository.expirePendingPayments(Temporal.PlainDateTime.from("2001-01-01T00:00:00"));

            expect(expired).toContainEqual({ paymentId, subscriptionId: order.subscriptionId });
            expect((await repository.findMethodChangeById(change.id))?.status).toBe("Expire");
            expect((await repository.findSubscriptionById(order.subscriptionId))?.status).toBe("Success");
        });
    });

    describe("reads and refunds", () => {
        it("finds changes by order, lists the refunds waiting and confirms each once", async () => {
            const userId = await createTestUser(db, rows);
            const order = await paidOrder({ userId, isDelivery: true }, 2);
            const created = await create({
                change: changeOf(order.subscriptionId, userId, { slotCount: 1, amount: 5000 }),
                slots: [{ orderId: order.slotIds[1]!, fee: 5000 }],
                payment: null,
                apply: true,
            });

            expect(
                (await repository.findMethodChangesBySubscriptionIds([order.subscriptionId])).map(change => change.id),
            ).toEqual([created.change.id]);
            const waiting = await repository.listMethodChanges({ needsRefund: true, skip: 0, take: 100 });
            expect(waiting.items.map(change => change.id)).toContain(created.change.id);

            const refundedAt = Temporal.PlainDateTime.from("2026-11-07T03:00:00");
            const confirmed = await repository.confirmMethodChangeRefund(created.change.id, refundedAt);
            expect(confirmed).toMatchObject({ needsRefund: false, refundedAt });
            expect(await repository.confirmMethodChangeRefund(created.change.id, refundedAt)).toBeNull();
            const after = await repository.listMethodChanges({ needsRefund: true, skip: 0, take: 100 });
            expect(after.items.map(change => change.id)).not.toContain(created.change.id);
        });

        it("marks the payment of an upgrade that was never applied as refunded", async () => {
            const userId = await createTestUser(db, rows);
            const order = await paidOrder({ userId }, 1);
            const paymentId = randomUUID();
            const created = await create({
                change: changeOf(order.subscriptionId, userId, {
                    toDelivery: true,
                    status: "Expire",
                    slotCount: 1,
                    amount: 3000,
                    needsRefund: true,
                }),
                slots: [{ orderId: order.slotIds[0]!, fee: 3000 }],
                payment: {
                    id: paymentId,
                    method: "MIDTRANS",
                    amount: 3000,
                    status: "Success",
                    paidAt: Temporal.PlainDateTime.from("2026-11-06T03:00:00"),
                },
                apply: false,
            });

            await repository.confirmMethodChangeRefund(
                created.change.id,
                Temporal.PlainDateTime.from("2026-11-07T03:00:00"),
            );

            const payments = await repository.findPaymentsBySubscriptionId(order.subscriptionId);
            expect(payments.find(payment => payment.id === paymentId)?.status).toBe("Refund");
            expect(payments.find(payment => payment.id === order.paymentId)?.status).toBe("Success");
        });
    });

    describe("sumMethodChangeIncome", () => {
        it("nets paid upgrades and confirmed delivery refunds of the period by package and purchase type", async () => {
            const userId = await createTestUser(db, rows);
            const from = Temporal.PlainDateTime.from("2990-01-01T00:00:00");
            const pickup = await paidOrder({ userId, purchaseType: "Offline" }, 1);
            const upgradeId = randomUUID();
            await create({
                change: changeOf(pickup.subscriptionId, userId, {
                    toDelivery: true,
                    status: "Success",
                    slotCount: 1,
                    deliveryFeePerSlot: 7000,
                    amount: 7000,
                    needsRefund: false,
                }),
                slots: [{ orderId: pickup.slotIds[0]!, fee: 7000 }],
                payment: {
                    id: upgradeId,
                    method: "CASH",
                    amount: 7000,
                    status: "Success",
                    paidAt: from.add({ hours: 1 }),
                },
                apply: true,
            });
            const delivered = await paidOrder({ userId, isDelivery: true, deliveryFeePerSlot: 2500 }, 1);
            const downgrade = await create({
                change: changeOf(delivered.subscriptionId, userId, { slotCount: 1, amount: 2500 }),
                slots: [{ orderId: delivered.slotIds[0]!, fee: 2500 }],
                payment: null,
                apply: true,
            });
            await repository.confirmMethodChangeRefund(downgrade.change.id, from.add({ hours: 2 }));

            const income = await repository.sumMethodChangeIncome({
                from,
                before: from.add({ days: 1 }),
                statuses: ["Success"],
            });

            expect(income.byPackage).toEqual([{ packageId, deliveryRevenue: 4500 }]);
            expect(income.byPurchaseType).toEqual(
                expect.arrayContaining([
                    { purchaseType: "Offline", deliveryRevenue: 7000 },
                    { purchaseType: "Online", deliveryRevenue: -2500 },
                ]),
            );
            expect(
                await repository.sumMethodChangeIncome({
                    from: from.add({ days: 1 }),
                    before: from.add({ days: 2 }),
                    statuses: ["Success"],
                }),
            ).toEqual({ byPackage: [], byPurchaseType: [] });
        });
    });
});

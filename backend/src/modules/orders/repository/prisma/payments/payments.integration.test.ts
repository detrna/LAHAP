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
import { PAID_SUBSCRIPTION_STATUSES } from "../../../domain/paid-subscriptions.js";
import { PrismaOrdersRepository } from "../orders-repository.js";

describe("PrismaOrdersRepository payments (integration)", () => {
    let db: Db;
    let repository: PrismaOrdersRepository;
    let rows: CreatedRows;
    let packageId: string;
    let menuId: string;
    let day = 0;
    const base = Temporal.PlainDate.from("2997-03-02");

    const schedule = async () =>
        createTestSchedule(db, rows, {
            packageId,
            date: base.add({ days: day++ }),
            isPublished: true,
            primaryMenuId: menuId,
        });

    const slots = async (input: Omit<TestSlotsInput, "packageId" | "slots">, count = 1) => {
        const scheduleIds: string[] = [];
        for (let index = 0; index < count; index++) scheduleIds.push(await schedule());
        return createTestSlots(db, rows, {
            packageId,
            slots: scheduleIds.map(scheduleId => ({ scheduleId })),
            ...input,
        });
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

    describe("changePayment", () => {
        it("applies the decided change to the payment and its subscription", async () => {
            const userId = await createTestUser(db, rows);
            const created = await slots({ userId, status: "Pending", payment: { status: "Pending" } });
            const paidAt = Temporal.PlainDateTime.from("2026-11-06T03:00:00");

            const result = await repository.changePayment(created.paymentId!, current => {
                expect(current.subscription.id).toBe(created.subscriptionId);
                return {
                    payment: {
                        status: "Success",
                        paidAt,
                        transactionId: `trx-${randomUUID()}`,
                        method: "MIDTRANS_QRIS",
                    },
                    subscription: { status: "Success" },
                };
            });

            expect(result?.before.payment.status).toBe("Pending");
            expect(result?.after?.payment).toMatchObject({ status: "Success", method: "MIDTRANS_QRIS", paidAt });
            expect(result?.after?.subscription.status).toBe("Success");
        });

        it("leaves everything as it is when nothing is decided or the decision throws", async () => {
            const userId = await createTestUser(db, rows);
            const created = await slots({ userId, status: "Pending", payment: { status: "Pending" } });

            expect((await repository.changePayment(created.paymentId!, () => null))?.after).toBeNull();
            await expect(
                repository.changePayment(created.paymentId!, () => {
                    throw new InvalidStateError("refused");
                }),
            ).rejects.toBeInstanceOf(InvalidStateError);
            expect((await repository.findSubscriptionById(created.subscriptionId))?.status).toBe("Pending");
            expect(await repository.changePayment(randomUUID(), () => null)).toBeNull();
        });

        it("serialises two changes to the same payment", async () => {
            const userId = await createTestUser(db, rows);
            const created = await slots({ userId, status: "Pending", payment: { status: "Pending" } });
            const decide = () =>
                repository.changePayment(created.paymentId!, current =>
                    current.payment.status === "Pending"
                        ? { payment: { status: "Success" }, subscription: { status: "Success" } }
                        : null,
                );

            const results = await Promise.all([decide(), decide()]);

            expect(results.filter(result => result?.after !== null)).toHaveLength(1);
        });
    });

    describe("expirePendingPayments", () => {
        it("expires old pending payments and their pending subscriptions only", async () => {
            const userId = await createTestUser(db, rows);
            const old = await slots({ userId, status: "Pending", payment: { status: "Pending" } });
            const fresh = await slots({ userId, status: "Pending", payment: { status: "Pending" } });
            const paid = await slots({ userId, status: "Success", payment: { status: "Success" } });
            const longAgo = Temporal.PlainDateTime.from("2000-01-01T00:00:00");
            for (const id of [old.paymentId!, paid.paymentId!]) {
                await db.orm.public.Payment.where({ id }).update({ createdAt: longAgo });
            }

            const expired = await repository.expirePendingPayments(Temporal.PlainDateTime.from("2001-01-01T00:00:00"));

            expect(expired).toContainEqual({ paymentId: old.paymentId, subscriptionId: old.subscriptionId });
            expect(expired.map(item => item.paymentId)).not.toContain(fresh.paymentId);
            expect(expired.map(item => item.paymentId)).not.toContain(paid.paymentId);
            expect((await repository.findSubscriptionById(old.subscriptionId))?.status).toBe("Expire");
            expect((await repository.findSubscriptionById(fresh.subscriptionId))?.status).toBe("Pending");
            expect((await repository.findSubscriptionById(paid.subscriptionId))?.status).toBe("Success");
        });
    });

    describe("order stats", () => {
        it("counts distinct paid service dates and sums paid tier discounts", async () => {
            const userId = await createTestUser(db, rows);
            const tier = await db.orm.public.Tier.create({
                name: `Zz Tier ${randomUUID().slice(0, 8)}`,
                requiredSubscriptionDays: 900000 + Math.floor(Math.random() * 90000),
                discountPercent: "5.00",
                durationDays: 30,
                photoKey: "tiers/test.webp",
            });
            const tierId = rows.track("Tier", tier.id);
            await slots({ userId, status: "Success", tierId, tierDiscount: 1500 }, 2);
            await slots({ userId, status: "Success", tierId, tierDiscount: 750 }, 1);
            await slots({ userId, status: "Pending", tierId, tierDiscount: 9999 }, 1);
            await slots({ userId, status: "Dibatalkan", tierDiscount: 0 }, 1);

            expect(await repository.countPaidServiceDays(userId, PAID_SUBSCRIPTION_STATUSES)).toBe(3);
            expect(await repository.countPaidServiceDays(randomUUID(), PAID_SUBSCRIPTION_STATUSES)).toBe(0);
            expect((await repository.sumTierDiscounts([tierId], PAID_SUBSCRIPTION_STATUSES)).get(tierId)).toBe(2250);
            expect((await repository.sumTierDiscounts([], PAID_SUBSCRIPTION_STATUSES)).size).toBe(0);
        });
    });
});

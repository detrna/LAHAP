import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestMenu, createTestSchedule } from "../../../../../../tests/utils/fixtures/schedules.js";
import { createTestPackage } from "../../../../../../tests/utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../../../../tests/utils/fixtures/users.js";
import { loadConfig } from "../../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../../infrastructure/database/prisma/db.js";
import { InvalidStateError } from "../../../../../shared/errors/invalid-state-error.js";
import { PROMO_CUSTOMER_USE_STATUSES, PROMO_USE_STATUSES } from "../../../domain/promo-usage.js";
import type { CheckoutWrite, PromoReservation } from "../../../service/interfaces/orders.repository.js";
import { PrismaOrdersRepository } from "../orders-repository.js";

describe("PrismaOrdersRepository checkout (integration)", () => {
    let db: Db;
    let repository: PrismaOrdersRepository;
    let rows: CreatedRows;
    let packageId: string;
    let scheduleIds: string[];
    let promoCodeId: string;
    const tag = randomUUID().slice(0, 8).toUpperCase();
    const firstDate = Temporal.PlainDate.from("2998-01-05");

    const reservation = (quota: number): PromoReservation => ({
        promoCodeId,
        quota,
        useStatuses: PROMO_USE_STATUSES,
        customerUseStatuses: PROMO_CUSTOMER_USE_STATUSES,
    });

    const write = (userId: string, overrides: Partial<CheckoutWrite> = {}): CheckoutWrite => {
        const subscriptionId = randomUUID();
        return {
            subscription: {
                id: subscriptionId,
                userId,
                packageId,
                promoCodeId: null,
                tierId: null,
                status: "Pending",
                purchaseType: "Online",
                period: "Harian",
                startDate: firstDate,
                endDate: firstDate.add({ days: 1 }),
                isDelivery: true,
                recipientName: "Budi Integration",
                deliveryAddress: "Jl. Ijen",
                deliveryLatitude: -7.95218912,
                deliveryLongitude: 112.61287634,
                deliveryDistanceKm: 4,
                notes: "tanpa sambal",
                pricePerPortion: 15000,
                foodSubtotal: 30000,
                tierDiscount: 1500,
                promoDiscount: 0,
                deliveryFeePerSlot: 2000,
                deliveryFeeTotal: 4000,
                totalPrice: 32500,
            },
            slots: scheduleIds.map((menuScheduleId, index) => ({
                id: randomUUID(),
                menuScheduleId,
                serviceDate: firstDate.add({ days: index }),
                isDelivery: true,
                deliveryFee: 2000,
            })),
            payment: { id: randomUUID(), method: "MIDTRANS", amount: 32500, status: "Pending", paidAt: null },
            promo: null,
            ...overrides,
        };
    };

    const track = (checkout: CheckoutWrite) => {
        rows.track("Subscription", checkout.subscription.id);
        rows.track("Payment", checkout.payment.id);
    };

    const withPromo = (userId: string, quota: number, status: "Pending" | "Success" = "Pending") => {
        const base = write(userId);
        return {
            ...base,
            subscription: { ...base.subscription, promoCodeId, status },
            promo: reservation(quota),
        };
    };

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaOrdersRepository(db);
        rows = trackCreated(db);
        packageId = await createTestPackage(db, rows);
        const menuId = await createTestMenu(db, rows);
        scheduleIds = [
            await createTestSchedule(db, rows, {
                packageId,
                date: firstDate,
                isPublished: true,
                primaryMenuId: menuId,
            }),
            await createTestSchedule(db, rows, {
                packageId,
                date: firstDate.add({ days: 1 }),
                isPublished: true,
                primaryMenuId: menuId,
            }),
        ];
        const promo = await db.orm.public.PromoCode.create({
            code: `ZZINT${tag}`,
            discountType: "Nominal",
            discountValue: "1000.00",
            minPurchase: "0.00",
            allowStackWithTier: true,
            validUntil: Temporal.PlainDateTime.from("2999-01-01T00:00:00"),
            quota: 10,
            isActive: true,
        });
        promoCodeId = rows.track("PromoCode", promo.id);
    });

    afterAll(async () => {
        await rows?.cleanup();
        await db?.close();
    });

    it("writes the subscription, its slots with service dates and history, and the payment", async () => {
        const userId = await createTestUser(db, rows);
        const checkout = write(userId);
        track(checkout);

        const created = await repository.createCheckout(checkout);

        expect(created.subscription).toMatchObject({
            id: checkout.subscription.id,
            status: "Pending",
            deliveryLatitude: -7.95218912,
            deliveryLongitude: 112.61287634,
            tierDiscount: 1500,
            totalPrice: 32500,
            needsRefund: false,
        });
        expect(created.payment).toMatchObject({ id: checkout.payment.id, type: "SUBSCRIPTION", amount: 32500 });
        expect(created.orders.map(order => [order.menuScheduleId, order.serviceDate.toString(), order.status])).toEqual(
            [
                [scheduleIds[0], "2998-01-05", "Terjadwal"],
                [scheduleIds[1], "2998-01-06", "Terjadwal"],
            ],
        );
        const history = await db.orm.public.OrderStatusHistory.where(entry =>
            entry.orderId.in(created.orders.map(order => order.id) as Varchar<36>[]),
        ).all();
        expect(history).toHaveLength(2);
        expect(history.every(entry => entry.fromStatus === null && entry.changedById === userId)).toBe(true);
        expect(await repository.findSubscriptionById(checkout.subscription.id)).toEqual(created.subscription);
        expect(await repository.findPaymentsBySubscriptionId(checkout.subscription.id)).toEqual([created.payment]);
    });

    it("gives a promo's last use to only one of two concurrent checkouts", async () => {
        const first = withPromo(await createTestUser(db, rows), 1);
        const second = withPromo(await createTestUser(db, rows), 1);
        track(first);
        track(second);

        const results = await Promise.allSettled([repository.createCheckout(first), repository.createCheckout(second)]);

        expect(results.map(result => result.status).sort()).toEqual(["fulfilled", "rejected"]);
        const rejected = results.find(result => result.status === "rejected") as PromiseRejectedResult;
        expect(rejected.reason).toBeInstanceOf(InvalidStateError);
        expect(rejected.reason.message).toBe("promo code quota is exhausted");
        expect((await repository.countPromoUses([promoCodeId], PROMO_USE_STATUSES)).get(promoCodeId)).toBe(1);
    });

    it("refuses a promo the customer already paid with, but not one they left pending", async () => {
        const userId = await createTestUser(db, rows);
        const pending = withPromo(userId, 10);
        track(pending);
        await repository.createCheckout(pending);
        const paid = withPromo(userId, 10, "Success");
        track(paid);
        await repository.createCheckout(paid);

        const again = withPromo(userId, 10);
        track(again);
        await expect(repository.createCheckout(again)).rejects.toMatchObject({
            statusCode: 422,
            message: "promo code has already been used",
        });
        expect(await repository.countPromoUsesByUser(promoCodeId, userId, PROMO_CUSTOMER_USE_STATUSES)).toBe(1);
        expect(await repository.hasSubscriptionsWithPromo(promoCodeId, ["Pending"])).toBe(true);
        expect(await repository.hasSubscriptionsWithPromo(randomUUID(), ["Pending"])).toBe(false);
        expect((await repository.countPromoUses([], PROMO_USE_STATUSES)).size).toBe(0);
    });

    it("turns a missing promo code into a 422 and writes nothing", async () => {
        const userId = await createTestUser(db, rows);
        const base = write(userId);
        const checkout = { ...base, subscription: { ...base.subscription, promoCodeId: randomUUID() } };

        await expect(repository.createCheckout(checkout)).rejects.toMatchObject({
            statusCode: 422,
            message: "promo code no longer exists",
        });
        expect(await repository.findSubscriptionById(checkout.subscription.id)).toBeNull();
    });
});

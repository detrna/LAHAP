import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import { SystemClock } from "../../../../src/infrastructure/clock/system/system.js";
import {
    computeMidtransSignature,
    MidtransPaymentGateway,
} from "../../../../src/infrastructure/payment-gateway/midtrans/midtrans.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import type { ObjectStorage } from "../../../../src/shared/ports/object-storage/object-storage.js";
import type { PaymentGateway } from "../../../../src/shared/ports/payment-gateway/payment-gateway.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createOrdersContainer } from "../../../utils/app/orders-container.js";
import { createAuthHeaders } from "../../../utils/factory/jwt/jwt.js";
import { ensureTestBusiness, type TestBusiness } from "../../../utils/fixtures/business.js";
import { createTestMenu, createTestSchedule } from "../../../utils/fixtures/schedules.js";
import { createTestSlots } from "../../../utils/fixtures/slots.js";
import { createTestPackage } from "../../../utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../utils/fixtures/users.js";

const objectStorage = {
    exists: async () => true,
    getSignedUrl: async (key: string) => `https://storage.test/${key}`,
} as unknown as ObjectStorage;

const SERVER_KEY = "SB-Mid-server-e2e-key";
const verifier = new MidtransPaymentGateway(
    { SERVER_KEY, SIGNATURE_KEY: "", BASE_URL: "https://app.sandbox.midtrans.com", TIMEOUT_MS: 1000, MAX_RETRIES: 0 },
    { IS_PRODUCTION: false, PORT: 4000 },
);
const midtransNotification = (orderId: string, amount: number, transactionStatus = "settlement") => {
    const grossAmount = amount.toFixed(2);
    return {
        order_id: orderId,
        status_code: "200",
        gross_amount: grossAmount,
        transaction_status: transactionStatus,
        transaction_id: `trx-${randomUUID()}`,
        payment_type: "qris",
        signature_key: computeMidtransSignature(orderId, "200", grossAmount, SERVER_KEY),
    };
};

const createdTransactions: { orderId: string; grossAmount: number; expiryMinutes?: number | undefined }[] = [];
const paymentGateway: PaymentGateway = {
    createTransaction: async input => {
        createdTransactions.push(input);
        return { token: `snap-${input.orderId}`, redirectUrl: `https://pay.test/${input.orderId}` };
    },
    verifyNotification: payload => verifier.verifyNotification(payload),
};

const asRole = (role: Role, userId: string = randomUUID()) =>
    createAuthHeaders({ role, sub: { userId, name: `E2E ${role}` } });

describe("orders routes (e2e)", () => {
    let db: Db;
    let rows: CreatedRows;
    let testApp: TestApp;
    let app: Express;
    let business: TestBusiness;
    let customerId: string;
    let allergyId: string;
    let packageId: string;
    let firstSlotId: string;
    let secondSlotId: string;
    let draftSlotId: string;
    let promoCode: string;
    let weekStart: Temporal.PlainDate;
    const tag = randomUUID().slice(0, 8).toUpperCase();

    const customer = () => asRole("CUSTOMER", customerId);
    const checkout = (overrides: Record<string, unknown> = {}) => ({
        packageId,
        purchaseType: "Online",
        period: "Harian",
        menuScheduleIds: [secondSlotId, firstSlotId],
        isDelivery: false,
        recipientName: "Budi E2E",
        ...overrides,
    });

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        business = await ensureTestBusiness(db, rows);

        const allergy = await db.orm.public.Allergy.create({ name: `Zz E2E Allergy ${tag}` });
        allergyId = rows.track("Allergy", allergy.id);
        const ingredient = await db.orm.public.Ingredient.create({
            name: `Zz E2E Ingredient ${tag}`,
            unit: "gram",
            photoKey: "ingredients/test.webp",
        });
        rows.track("Ingredient", ingredient.id);
        const ingredientAllergy = await db.orm.public.IngredientAllergy.create({
            ingredientId: ingredient.id,
            allergyId,
        });
        rows.track("IngredientAllergy", ingredientAllergy.id);
        customerId = await createTestUser(db, rows, { allergyIds: [allergyId] });

        packageId = await createTestPackage(db, rows, {
            basePrice: 15000,
            periods: ["Harian", "Mingguan"],
            deliveryTimes: ["07:00", "12:00"],
        });
        const menuId = await createTestMenu(db, rows, {
            ingredients: [{ ingredientId: ingredient.id, quantityPerPortion: 100 }],
        });

        const today = new SystemClock().now().toPlainDate();
        weekStart = today.subtract({ days: today.dayOfWeek - 1 }).add({ days: 14 });
        firstSlotId = await createTestSchedule(db, rows, {
            packageId,
            date: weekStart,
            deliveryTime: "12:00",
            isPublished: true,
            primaryMenuId: menuId,
        });
        secondSlotId = await createTestSchedule(db, rows, {
            packageId,
            date: weekStart.add({ days: 1 }),
            deliveryTime: "12:00",
            isPublished: true,
            primaryMenuId: menuId,
        });
        await createTestSchedule(db, rows, {
            packageId,
            date: weekStart.add({ days: 1 }),
            deliveryTime: "07:00",
            isPublished: true,
            primaryMenuId: menuId,
        });
        draftSlotId = await createTestSchedule(db, rows, {
            packageId,
            date: weekStart.add({ days: 2 }),
            deliveryTime: "12:00",
            primaryMenuId: menuId,
        });

        promoCode = `ZZ${tag}`;
        const promo = await db.orm.public.PromoCode.create({
            code: promoCode,
            discountType: "Nominal",
            discountValue: "5000.00",
            minPurchase: "0.00",
            allowStackWithTier: true,
            validUntil: Temporal.Now.plainDateTimeISO("UTC").add({ days: 7 }),
            quota: 10,
            isActive: true,
        });
        rows.track("PromoCode", promo.id);

        testApp = await createTestApp({
            db,
            adapters: { objectStorage, paymentGateway },
            mount: deps => [createOrdersContainer(deps).router],
        });
        app = testApp.app;
    });

    const trackCheckout = (body: { data: { subscription: { id: string }; payment: { id: string } } }) => {
        rows.track("Subscription", body.data.subscription.id);
        rows.track("Payment", body.data.payment.id);
    };

    afterAll(async () => {
        await rows?.cleanup();
        await testApp?.close();
        await db?.close();
    });

    describe("POST /api/subscriptions/preview", () => {
        it("needs a signed-in customer", async () => {
            expect((await request(app).post("/api/subscriptions/preview").send(checkout())).status).toBe(401);
            const asAdmin = await request(app).post("/api/subscriptions/preview").set(asRole("ADMIN")).send(checkout());
            expect(asAdmin.status).toBe(403);
        });

        it("rejects an invalid body", async () => {
            const response = await request(app)
                .post("/api/subscriptions/preview")
                .set(customer())
                .send(checkout({ menuScheduleIds: [] }));
            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
        });

        it("prices the chosen slots with the promo and warns about allergens", async () => {
            const response = await request(app)
                .post("/api/subscriptions/preview")
                .set(customer())
                .send(checkout({ promoCode: promoCode.toLowerCase() }));

            expect(response.status).toBe(200);
            const preview = response.body.data;
            expect(preview.slots.map((slot: { menuScheduleId: string }) => slot.menuScheduleId)).toEqual([
                firstSlotId,
                secondSlotId,
            ]);
            expect(preview.slots[0].clashingAllergies.map((allergy: { id: string }) => allergy.id)).toEqual([
                allergyId,
            ]);
            expect(preview.slots[0].deliveryTime).toEqual({ time: "12:00", range: "Siang" });
            expect(preview).toMatchObject({
                slotCount: 2,
                startDate: weekStart.toString(),
                cutoffAt: `${weekStart.subtract({ days: 1 }).toString()}T23:59:59.999+07:00`,
                promo: { code: promoCode, applied: true, reason: null },
                foodSubtotal: 30000,
                tierDiscount: 0,
                promoDiscount: 5000,
                totalPrice: 25000,
            });
        });

        it("quotes free delivery at the kitchen", async () => {
            const response = await request(app)
                .post("/api/subscriptions/preview")
                .set(customer())
                .send(
                    checkout({
                        isDelivery: true,
                        deliveryAddress: "Dapur",
                        deliveryLatitude: business.latitude,
                        deliveryLongitude: business.longitude,
                    }),
                );

            expect(response.status).toBe(200);
            expect(response.body.data.delivery).toMatchObject({ available: true, distanceKm: 0, feePerSlot: 0 });
        });

        it("takes the week's published slots at the chosen meal time", async () => {
            const response = await request(app)
                .post("/api/subscriptions/preview")
                .set(customer())
                .send(
                    checkout({
                        period: "Mingguan",
                        menuScheduleIds: undefined,
                        periodStart: weekStart.toString(),
                        deliveryTimes: ["12:00"],
                    }),
                );

            expect(response.status).toBe(200);
            expect(response.body.data.slotCount).toBe(2);
            expect(response.body.data.endDate).toBe(weekStart.add({ days: 1 }).toString());
        });

        it("refuses an unpublished slot with 422", async () => {
            const response = await request(app)
                .post("/api/subscriptions/preview")
                .set(customer())
                .send(checkout({ menuScheduleIds: [draftSlotId] }));

            expect(response.status).toBe(422);
            expect(response.body.error).toMatchObject({ code: "INVALID_STATE", message: "slot is not available" });
        });

        it("refuses a period the package does not offer with 422", async () => {
            const response = await request(app)
                .post("/api/subscriptions/preview")
                .set(customer())
                .send(
                    checkout({
                        period: "Bulanan",
                        menuScheduleIds: undefined,
                        periodStart: weekStart.with({ day: 1 }).add({ months: 1 }).toString(),
                        deliveryTimes: ["12:00"],
                    }),
                );

            expect(response.status).toBe(422);
        });
    });

    describe("POST /api/subscriptions", () => {
        it("needs a signed-in customer", async () => {
            expect((await request(app).post("/api/subscriptions").send(checkout())).status).toBe(401);
            expect((await request(app).post("/api/subscriptions").set(asRole("KITCHEN")).send(checkout())).status).toBe(
                403,
            );
        });

        it("saves a pending order, opens a Midtrans transaction and reopens its session", async () => {
            const response = await request(app).post("/api/subscriptions").set(customer()).send(checkout());

            expect(response.status).toBe(201);
            trackCheckout(response.body);
            const { subscription, payment, paymentSession } = response.body.data;
            expect(subscription).toMatchObject({
                userId: customerId,
                status: "Pending",
                displayStatus: null,
                period: "Harian",
                startDate: weekStart.toString(),
                totalPrice: 30000,
                isDelivery: false,
                deliveryAddress: null,
            });
            expect(payment).toMatchObject({
                method: "MIDTRANS",
                doneOnline: true,
                status: "Pending",
                amount: 30000,
                paidAt: null,
            });
            expect(createdTransactions.at(-1)).toMatchObject({ orderId: payment.id, grossAmount: 30000 });
            expect(paymentSession).toMatchObject({
                snapToken: `snap-${payment.id}`,
                redirectUrl: `https://pay.test/${payment.id}`,
            });

            const slots = await db.orm.public.Order.where({ subscriptionId: subscription.id }).all();
            expect(slots.map(slot => slot.serviceDate.toString()).sort()).toEqual([
                weekStart.toString(),
                weekStart.add({ days: 1 }).toString(),
            ]);

            const reopened = await request(app)
                .post(`/api/subscriptions/${subscription.id}/payment-session`)
                .set(customer());
            expect(reopened.status).toBe(200);
            expect(reopened.body.data).toEqual(paymentSession);

            const stranger = await request(app)
                .post(`/api/subscriptions/${subscription.id}/payment-session`)
                .set(asRole("CUSTOMER"));
            expect(stranger.status).toBe(404);
        });

        it("saves an offline cash order without a payment session", async () => {
            const before = createdTransactions.length;
            const response = await request(app)
                .post("/api/subscriptions")
                .set(customer())
                .send(checkout({ purchaseType: "Offline", paymentMethod: "CASH" }));

            expect(response.status).toBe(201);
            trackCheckout(response.body);
            expect(response.body.data.payment).toMatchObject({ method: "CASH", doneOnline: false });
            expect(response.body.data.paymentSession).toBeNull();
            expect(createdTransactions.length).toBe(before);

            const reopened = await request(app)
                .post(`/api/subscriptions/${response.body.data.subscription.id}/payment-session`)
                .set(customer());
            expect(reopened.status).toBe(422);
        });

        it("refuses cash for an online order", async () => {
            const response = await request(app)
                .post("/api/subscriptions")
                .set(customer())
                .send(checkout({ paymentMethod: "CASH" }));

            expect(response.status).toBe(422);
            expect(response.body.error.message).toBe("online orders cannot be paid in cash");
        });

        it("refuses delivery past the max distance", async () => {
            const response = await request(app)
                .post("/api/subscriptions")
                .set(customer())
                .send(
                    checkout({
                        isDelivery: true,
                        deliveryAddress: "Jauh sekali",
                        deliveryLatitude: business.latitude + 1,
                        deliveryLongitude: business.longitude,
                    }),
                );

            expect(response.status).toBe(422);
            expect(response.body.error.message).toBe("delivery is not available for this address");
        });

        it("counts the promo use while the order is pending", async () => {
            const response = await request(app)
                .post("/api/subscriptions")
                .set(customer())
                .send(checkout({ promoCode: promoCode }));

            expect(response.status).toBe(201);
            trackCheckout(response.body);
            expect(response.body.data.subscription).toMatchObject({ promoDiscount: 5000, totalPrice: 25000 });
            const used = await db.orm.public.Subscription.where({
                promoCodeId: response.body.data.subscription.promoCodeId,
            })
                .select("id")
                .all();
            expect(used).toHaveLength(1);
        });
    });

    describe("payment events", () => {
        const order = async (overrides: Record<string, unknown> = {}) => {
            const response = await request(app).post("/api/subscriptions").set(customer()).send(checkout(overrides));
            expect(response.status).toBe(201);
            trackCheckout(response.body);
            return response.body.data as { subscription: { id: string }; payment: { id: string; amount: number } };
        };
        const statusOf = async (subscriptionId: string) =>
            (await db.orm.public.Subscription.where({ id: subscriptionId }).select("status").first())?.status;

        it("marks the order paid on a signed Midtrans settlement, once", async () => {
            const { subscription, payment } = await order();
            const notification = midtransNotification(payment.id, payment.amount);

            const first = await request(app).post("/api/webhooks/midtrans").send(notification);
            expect(first.status).toBe(200);
            expect(first.body.data).toEqual({ received: true });
            expect(await statusOf(subscription.id)).toBe("Success");
            const stored = await db.orm.public.Payment.where({ id: payment.id }).first();
            expect(stored).toMatchObject({ status: "Success", method: "MIDTRANS_QRIS" });
            expect(stored?.paidAt).not.toBeNull();

            const again = await request(app).post("/api/webhooks/midtrans").send(notification);
            expect(again.status).toBe(200);
            const reopened = await request(app)
                .post(`/api/subscriptions/${subscription.id}/payment-session`)
                .set(customer());
            expect(reopened.status).toBe(422);
        });

        it("refuses a notification with a bad signature", async () => {
            const { payment } = await order();
            const notification = {
                ...midtransNotification(payment.id, payment.amount),
                signature_key: "0".repeat(128),
            };

            const response = await request(app).post("/api/webhooks/midtrans").send(notification);

            expect(response.status).toBe(401);
        });

        it("ignores a notification for another amount", async () => {
            const { subscription, payment } = await order();

            const response = await request(app)
                .post("/api/webhooks/midtrans")
                .send(midtransNotification(payment.id, payment.amount + 1000));

            expect(response.status).toBe(200);
            expect(await statusOf(subscription.id)).toBe("Pending");
        });

        it("expires the order on a Midtrans expiry", async () => {
            const { subscription, payment } = await order();

            await request(app)
                .post("/api/webhooks/midtrans")
                .send(midtransNotification(payment.id, payment.amount, "expire"));

            expect(await statusOf(subscription.id)).toBe("Expire");
        });

        it("lets an admin verify a cash payment once", async () => {
            const { subscription, payment } = await order({ purchaseType: "Offline", paymentMethod: "CASH" });

            const asCustomer = await request(app).post(`/api/admin/payments/${payment.id}/verify-cash`).set(customer());
            expect(asCustomer.status).toBe(403);

            const verified = await request(app)
                .post(`/api/admin/payments/${payment.id}/verify-cash`)
                .set(asRole("ADMIN"));
            expect(verified.status).toBe(200);
            expect(verified.body.data).toMatchObject({ id: payment.id, status: "Success", doneOnline: false });
            expect(await statusOf(subscription.id)).toBe("Success");

            const again = await request(app).post(`/api/admin/payments/${payment.id}/verify-cash`).set(asRole("ADMIN"));
            expect(again.status).toBe(422);

            const unknown = await request(app)
                .post(`/api/admin/payments/${randomUUID()}/verify-cash`)
                .set(asRole("ADMIN"));
            expect(unknown.status).toBe(404);
        });

        it("lets an admin confirm a refund of a cancelled paid order", async () => {
            const scheduleId = await createTestSchedule(db, rows, {
                packageId,
                date: weekStart.add({ days: 5 }),
                isPublished: true,
            });
            const cancelled = await createTestSlots(db, rows, {
                userId: customerId,
                packageId,
                status: "Dibatalkan",
                needsRefund: true,
                slots: [{ scheduleId }],
                payment: { status: "Success" },
            });

            const confirmed = await request(app)
                .post(`/api/admin/payments/${cancelled.paymentId}/confirm-refund`)
                .set(asRole("ADMIN"));
            expect(confirmed.status).toBe(200);
            expect(confirmed.body.data.status).toBe("Refund");
            const subscription = await db.orm.public.Subscription.where({ id: cancelled.subscriptionId }).first();
            expect(subscription?.needsRefund).toBe(false);

            const again = await request(app)
                .post(`/api/admin/payments/${cancelled.paymentId}/confirm-refund`)
                .set(asRole("ADMIN"));
            expect(again.status).toBe(422);
        });
    });

    describe("customer views and actions", () => {
        let shopperId: string;
        const shopper = () => asRole("CUSTOMER", shopperId);

        const paidOrder = async () => {
            const created = await request(app).post("/api/subscriptions").set(shopper()).send(checkout());
            expect(created.status).toBe(201);
            trackCheckout(created.body);
            const { subscription, payment } = created.body.data;
            const paid = await request(app)
                .post("/api/webhooks/midtrans")
                .send(midtransNotification(payment.id, payment.amount));
            expect(paid.status).toBe(200);
            return subscription.id as string;
        };

        beforeAll(async () => {
            shopperId = await createTestUser(db, rows);
        });

        it("lists the customer's orders and shows one with its slots and payments", async () => {
            const subscriptionId = await paidOrder();

            const list = await request(app).get("/api/subscriptions?status=Success").set(shopper());
            expect(list.status).toBe(200);
            expect(list.body.data.map((item: { id: string }) => item.id)).toContain(subscriptionId);
            expect(list.body.meta).toMatchObject({ page: 1 });

            const detail = await request(app).get(`/api/subscriptions/${subscriptionId}`).set(shopper());
            expect(detail.status).toBe(200);
            expect(detail.body.data).toMatchObject({ status: "Success", displayStatus: "Akan Datang" });
            expect(detail.body.data.orders).toHaveLength(2);
            expect(detail.body.data.orders[0]).toMatchObject({ status: "Terjadwal", obstacles: [] });
            expect(detail.body.data.orders[0].menu.id).toBeTypeOf("string");
            expect(detail.body.data.payments[0]).toMatchObject({ status: "Success", doneOnline: true });

            expect((await request(app).get(`/api/subscriptions/${subscriptionId}`).set(customer())).status).toBe(404);

            const payments = await request(app).get("/api/payments?limit=1").set(shopper());
            expect(payments.status).toBe(200);
            expect(payments.body.data).toHaveLength(1);
        });

        it("shows the day's slots, skips one, then skips the rest of the day", async () => {
            await paidOrder();
            const day = weekStart.add({ days: 1 }).toString();

            const slots = await request(app).get(`/api/orders?date=${day}`).set(shopper());
            expect(slots.status).toBe(200);
            const ids = slots.body.data.map((slot: { id: string }) => slot.id) as string[];
            expect(ids.length).toBeGreaterThanOrEqual(2);
            expect(slots.body.data[0].menuSchedule.date).toBe(day);

            const skipped = await request(app)
                .post(`/api/orders/${ids[0]}/skip`)
                .set(shopper())
                .send({ skipReason: "mudik" });
            expect(skipped.status).toBe(200);
            expect(skipped.body.data).toMatchObject({ id: ids[0], status: "Dilewati", skipReason: "mudik" });

            const again = await request(app).post(`/api/orders/${ids[0]}/skip`).set(shopper()).send({});
            expect(again.status).toBe(422);
            expect((await request(app).post(`/api/orders/${ids[1]}/skip`).set(customer()).send({})).status).toBe(404);

            const rest = await request(app).post("/api/orders/skip-day").set(shopper()).send({ date: day });
            expect(rest.status).toBe(200);
            expect(rest.body.data.skippedCount).toBe(ids.length - 1);
            expect(rest.body.data.orders.every((slot: { status: string }) => slot.status === "Dilewati")).toBe(true);
        });

        it("cancels a paid order before the cut-off and flags the refund", async () => {
            const subscriptionId = await paidOrder();

            const cancelled = await request(app).post(`/api/subscriptions/${subscriptionId}/cancel`).set(shopper());

            expect(cancelled.status).toBe(200);
            expect(cancelled.body.data).toMatchObject({ status: "Dibatalkan", needsRefund: true, displayStatus: null });
            const again = await request(app).post(`/api/subscriptions/${subscriptionId}/cancel`).set(shopper());
            expect(again.status).toBe(422);
        });

        it("refuses to cancel after the cut-off", async () => {
            const today = new SystemClock().now().toPlainDate();
            const scheduleId = await createTestSchedule(db, rows, {
                packageId,
                date: today,
                deliveryTime: "07:00",
                isPublished: true,
            });
            const started = await createTestSlots(db, rows, {
                userId: shopperId,
                packageId,
                status: "Success",
                slots: [{ scheduleId }],
                payment: { status: "Success" },
            });

            const response = await request(app)
                .post(`/api/subscriptions/${started.subscriptionId}/cancel`)
                .set(shopper());

            expect(response.status).toBe(422);
            expect(response.body.error.message).toBe("cut-off has passed");
        });
    });

    describe("kitchen operations", () => {
        let scheduleId: string;
        let cookId: string;
        const cook = () => asRole("KITCHEN", cookId);

        beforeAll(async () => {
            cookId = await createTestUser(db, rows, { role: "KITCHEN" });
            const primaryId = await createTestMenu(db, rows);
            const alternativeId = await createTestMenu(db, rows, { isAlternative: true });
            scheduleId = await createTestSchedule(db, rows, {
                packageId,
                date: weekStart.add({ days: 3 }),
                deliveryTime: "12:00",
                isPublished: true,
                primaryMenuId: primaryId,
                alternativeMenuId: alternativeId,
            });
        });

        const preparedSlot = async () => {
            const created = await createTestSlots(db, rows, {
                userId: customerId,
                packageId,
                status: "Success",
                slots: [{ scheduleId, status: "Disiapkan" }],
                payment: { status: "Success" },
            });
            return created.slotIds[0]!;
        };

        it("switches a slot to the alternative menu and back", async () => {
            const slotId = await preparedSlot();

            const asCustomer = await request(app)
                .post(`/api/kitchen/orders/${slotId}/alternative-menu`)
                .set(customer());
            expect(asCustomer.status).toBe(403);

            const switched = await request(app).post(`/api/kitchen/orders/${slotId}/alternative-menu`).set(cook());
            expect(switched.status).toBe(200);
            expect(switched.body.data).toMatchObject({ id: slotId, usesAlternativeMenu: true, status: "Disiapkan" });
            expect(switched.body.data.menu.isAlternative).toBe(true);

            const back = await request(app).delete(`/api/kitchen/orders/${slotId}/alternative-menu`).set(cook());
            expect(back.status).toBe(200);
            expect(back.body.data.usesAlternativeMenu).toBe(false);
        });

        it("refuses an alternative for a schedule that has none", async () => {
            const created = await createTestSlots(db, rows, {
                userId: customerId,
                packageId,
                status: "Success",
                slots: [{ scheduleId: firstSlotId, status: "Disiapkan" }],
            });

            const response = await request(app)
                .post(`/api/kitchen/orders/${created.slotIds[0]}/alternative-menu`)
                .set(cook());

            expect(response.status).toBe(422);
            expect(response.body.error.message).toBe("schedule has no alternative menu");
        });

        it("marks a schedule's prepared slots ready, once", async () => {
            const slotId = await preparedSlot();

            const ready = await request(app)
                .post("/api/kitchen/food-ready")
                .set(cook())
                .send({ menuScheduleId: scheduleId });
            expect(ready.status).toBe(200);
            expect(ready.body.data.updatedCount).toBeGreaterThanOrEqual(1);
            const stored = await db.orm.public.Order.where({ id: slotId }).first();
            expect(stored?.status).toBe("Siap Diambil");
            const history = await db.orm.public.OrderStatusHistory.where({ orderId: slotId }).all();
            expect(history).toEqual([
                expect.objectContaining({ fromStatus: "Disiapkan", toStatus: "Siap Diambil", changedById: cookId }),
            ]);

            const again = await request(app)
                .post("/api/kitchen/food-ready")
                .set(cook())
                .send({ orderIds: [slotId] });
            expect(again.body.data.updatedCount).toBe(0);

            const late = await request(app).post(`/api/kitchen/orders/${slotId}/alternative-menu`).set(cook());
            expect(late.status).toBe(422);
        });

        it("rejects an empty food-ready request", async () => {
            const response = await request(app).post("/api/kitchen/food-ready").set(cook()).send({});
            expect(response.status).toBe(400);
        });
    });

    describe("courier and admin slot actions", () => {
        let courierId: string;
        let otherCourierId: string;
        let scheduleId: string;
        let adminId: string;
        const courier = () => asRole("COURIER", courierId);
        const admin = () => asRole("ADMIN", adminId);
        const scheduleDate = () => weekStart.add({ days: 4 });

        beforeAll(async () => {
            courierId = await createTestUser(db, rows, { role: "COURIER", name: "Zz E2E Courier" });
            otherCourierId = await createTestUser(db, rows, { role: "COURIER" });
            adminId = await createTestUser(db, rows, { role: "ADMIN" });
            scheduleId = await createTestSchedule(db, rows, {
                packageId,
                date: scheduleDate(),
                deliveryTime: "18:30",
                isPublished: true,
                primaryMenuId: await createTestMenu(db, rows),
            });
        });

        const slot = async (isDelivery: boolean, status: "Terjadwal" | "Diantar" | "Siap Diambil" | "Disiapkan") =>
            (
                await createTestSlots(db, rows, {
                    userId: customerId,
                    packageId,
                    status: "Success",
                    isDelivery,
                    slots: [{ scheduleId, status }],
                })
            ).slotIds[0]!;

        it("assigns couriers by meal time and shows the overview", async () => {
            const first = await slot(true, "Terjadwal");
            const second = await slot(true, "Terjadwal");
            await slot(false, "Terjadwal");

            const refused = await request(app)
                .put("/api/admin/courier-assignments")
                .set(admin())
                .send({ courierId: customerId, orderIds: [first] });
            expect(refused.status).toBe(422);

            const assigned = await request(app)
                .put("/api/admin/courier-assignments")
                .set(admin())
                .send({ courierId, date: scheduleDate().toString(), deliveryTime: "18:30", packageId });
            expect(assigned.status).toBe(200);
            expect(assigned.body.data.updatedCount).toBeGreaterThanOrEqual(2);
            const stored = await db.orm.public.Order.where({ id: second }).first();
            expect(stored?.courierId).toBe(courierId);

            const overview = await request(app)
                .get(`/api/admin/courier-assignments?from=${scheduleDate()}&to=${scheduleDate()}`)
                .set(admin());
            expect(overview.status).toBe(200);
            const entry = overview.body.data.find(
                (item: { deliveryTime: { time: string } }) => item.deliveryTime.time === "18:30",
            );
            expect(entry).toMatchObject({ date: scheduleDate().toString(), unassignedCount: 0 });
            expect(entry.courier).toMatchObject({ id: courierId, role: "COURIER" });

            expect((await request(app).get("/api/admin/courier-assignments").set(courier())).status).toBe(403);
        });

        it("lets only the assigned courier complete a delivery", async () => {
            const slotId = await slot(true, "Diantar");
            await request(app)
                .put("/api/admin/courier-assignments")
                .set(admin())
                .send({ courierId, orderIds: [slotId] });

            const stranger = await request(app)
                .post(`/api/courier/orders/${slotId}/complete`)
                .set(asRole("COURIER", otherCourierId));
            expect(stranger.status).toBe(404);

            const done = await request(app).post(`/api/courier/orders/${slotId}/complete`).set(courier());
            expect(done.status).toBe(200);
            expect(done.body.data.status).toBe("Selesai");
            expect(done.body.data.completedAt).toBeTypeOf("string");

            const again = await request(app).post(`/api/courier/orders/${slotId}/complete`).set(courier());
            expect(again.status).toBe(422);
        });

        it("lets an admin complete a pick-up and correct a status with a note", async () => {
            const pickup = await slot(false, "Siap Diambil");
            const collected = await request(app).post(`/api/admin/orders/${pickup}/complete`).set(admin());
            expect(collected.status).toBe(200);
            expect(collected.body.data.status).toBe("Selesai");

            const forgotten = await slot(true, "Disiapkan");
            const noNote = await request(app)
                .patch(`/api/admin/orders/${forgotten}/status`)
                .set(admin())
                .send({ status: "Selesai" });
            expect(noNote.status).toBe(400);

            const corrected = await request(app)
                .patch(`/api/admin/orders/${forgotten}/status`)
                .set(admin())
                .send({ status: "Selesai", adminNote: "Kurir lupa menandai Selesai" });
            expect(corrected.status).toBe(200);
            const history = await db.orm.public.OrderStatusHistory.where({ orderId: forgotten }).all();
            expect(history).toEqual([
                expect.objectContaining({
                    fromStatus: "Disiapkan",
                    toStatus: "Selesai",
                    adminNote: "Kurir lupa menandai Selesai",
                }),
            ]);

            const backwards = await request(app)
                .patch(`/api/admin/orders/${forgotten}/status`)
                .set(admin())
                .send({ status: "Diantar", adminNote: "salah" });
            expect(backwards.status).toBe(422);
        });
    });

    describe("admin lists", () => {
        it("lists and shows subscriptions, slots and payments for the admin only", async () => {
            const created = await request(app).post("/api/subscriptions").set(customer()).send(checkout());
            expect(created.status).toBe(201);
            trackCheckout(created.body);
            const { subscription, payment } = created.body.data;
            await request(app).post("/api/webhooks/midtrans").send(midtransNotification(payment.id, payment.amount));

            expect((await request(app).get("/api/admin/subscriptions").set(customer())).status).toBe(403);

            const subscriptions = await request(app)
                .get(`/api/admin/subscriptions?userId=${customerId}&status=Success&limit=50`)
                .set(asRole("ADMIN"));
            expect(subscriptions.status).toBe(200);
            const listed = subscriptions.body.data.find((item: { id: string }) => item.id === subscription.id);
            expect(listed.user).toMatchObject({ id: customerId, role: "CUSTOMER" });

            const detail = await request(app).get(`/api/admin/subscriptions/${subscription.id}`).set(asRole("ADMIN"));
            expect(detail.status).toBe(200);
            expect(detail.body.data.orders).toHaveLength(2);
            expect(detail.body.data.payments[0].status).toBe("Success");

            const slots = await request(app)
                .get(`/api/admin/orders?date=${weekStart}&deliveryTime=12:00&subscriptionId=${subscription.id}`)
                .set(asRole("ADMIN"));
            expect(slots.status).toBe(200);
            expect(slots.body.meta.total).toBe(1);
            const [slot] = slots.body.data;
            expect(slot.subscription).toMatchObject({ id: subscription.id, user: { id: customerId } });

            const slotDetail = await request(app).get(`/api/admin/orders/${slot.id}`).set(asRole("ADMIN"));
            expect(slotDetail.status).toBe(200);
            expect(slotDetail.body.data.statusHistory[0]).toMatchObject({
                fromStatus: null,
                toStatus: "Terjadwal",
                changedBy: { id: customerId },
            });

            const payments = await request(app)
                .get(`/api/admin/payments?userId=${customerId}&method=MIDTRANS_QRIS&limit=50`)
                .set(asRole("ADMIN"));
            expect(payments.status).toBe(200);
            expect(payments.body.data.map((item: { id: string }) => item.id)).toContain(payment.id);

            const badRange = await request(app)
                .get("/api/admin/payments?from=2026-11-10&to=2026-11-01")
                .set(asRole("ADMIN"));
            expect(badRange.status).toBe(400);
        });
    });

    describe("reports", () => {
        it("gives the admin the income report and dashboard for a period", async () => {
            const adminId = await createTestUser(db, rows, { role: "ADMIN" });
            const admin = asRole("ADMIN", adminId);

            const income = await request(app).get("/api/admin/reports/income?period=month").set(admin);
            expect(income.status).toBe(200);
            expect(income.body.data).toMatchObject({ period: "month" });
            expect(income.body.data.total.orderCount).toBeGreaterThanOrEqual(1);
            const ownPackage = income.body.data.byPackage.find(
                (row: { packageId: string }) => row.packageId === packageId,
            );
            expect(ownPackage?.orderCount).toBeGreaterThanOrEqual(1);

            const dashboard = await request(app).get("/api/admin/dashboard").set(admin);
            expect(dashboard.status).toBe(200);
            expect(dashboard.body.data).toMatchObject({ period: "today", unreadNotificationCount: 0, shortages: [] });
            expect(dashboard.body.data.income).toEqual(
                expect.objectContaining({ orderCount: expect.any(Number), totalRevenue: expect.any(Number) }),
            );

            expect((await request(app).get("/api/admin/reports/income?period=year").set(admin)).status).toBe(400);
            expect((await request(app).get("/api/admin/dashboard").set(customer())).status).toBe(403);
        });
    });

    describe("delivery method changes", () => {
        let switcherId: string;
        let adminHeaders: Record<string, string>;
        const switcher = () => asRole("CUSTOMER", switcherId);
        const pin = () => ({
            deliveryAddress: "Jl. Ijen E2E",
            deliveryLatitude: business.latitude + 0.04,
            deliveryLongitude: business.longitude,
        });

        beforeAll(async () => {
            switcherId = await createTestUser(db, rows);
            adminHeaders = asRole("ADMIN", await createTestUser(db, rows, { role: "ADMIN" }));
        });

        it("upgrades a paid pick-up order to delivery once the fee is paid, then switches part of it back", async () => {
            const created = await request(app).post("/api/subscriptions").set(switcher()).send(checkout());
            expect(created.status).toBe(201);
            trackCheckout(created.body);
            const { subscription, payment } = created.body.data;
            await request(app).post("/api/webhooks/midtrans").send(midtransNotification(payment.id, payment.amount));
            const base = `/api/subscriptions/${subscription.id}/delivery-method`;

            const preview = await request(app)
                .post(`${base}/preview`)
                .set(switcher())
                .send({ isDelivery: true, ...pin() });
            expect(preview.status).toBe(200);
            expect(preview.body.data).toMatchObject({
                toDelivery: true,
                effectiveFrom: weekStart.toString(),
                slotCount: 2,
                delivery: { available: true },
            });
            expect(preview.body.data.amount).toBe(preview.body.data.deliveryFeePerSlot * 2);

            const upgrade = await request(app)
                .post(base)
                .set(switcher())
                .send({ isDelivery: true, ...pin() });
            expect(upgrade.status).toBe(201);
            rows.track("Payment", upgrade.body.data.payment.id);
            rows.track("DeliveryMethodChange", upgrade.body.data.change.id);
            const fee = preview.body.data.deliveryFeePerSlot as number;
            expect(fee).toBeGreaterThan(0);

            expect(upgrade.body.data).toMatchObject({
                change: { status: "Pending", amount: fee * 2 },
                payment: { type: "DELIVERY_SERVICE_UPGRADE", status: "Pending", amount: fee * 2 },
            });
            const session = await request(app)
                .post(`/api/delivery-method-changes/${upgrade.body.data.change.id}/payment-session`)
                .set(switcher());
            expect(session.status).toBe(200);
            expect(session.body.data.snapToken).toBe(`snap-${upgrade.body.data.payment.id}`);
            const second = await request(app).post(base).set(switcher()).send({ isDelivery: false });
            expect(second.status).toBe(422);

            const paid = await request(app)
                .post("/api/webhooks/midtrans")
                .send(midtransNotification(upgrade.body.data.payment.id, fee * 2));
            expect(paid.status).toBe(200);

            const detail = await request(app).get(`/api/subscriptions/${subscription.id}`).set(switcher());
            expect(detail.body.data).toMatchObject({ isDelivery: true, deliveryAddress: "Jl. Ijen E2E" });
            expect(detail.body.data.orders.map((order: { isDelivery: boolean }) => order.isDelivery)).toEqual([
                true,
                true,
            ]);
            expect(detail.body.data.deliveryMethodChanges).toMatchObject([{ status: "Success", toDelivery: true }]);

            const downgrade = await request(app)
                .post(base)
                .set(switcher())
                .send({ isDelivery: false, effectiveFrom: weekStart.add({ days: 1 }).toString() });
            expect(downgrade.status).toBe(201);
            rows.track("DeliveryMethodChange", downgrade.body.data.change.id);
            expect(downgrade.body.data).toMatchObject({
                change: { status: "Success", slotCount: 1, amount: fee, needsRefund: true },
                payment: null,
            });
            const after = await request(app).get(`/api/subscriptions/${subscription.id}`).set(switcher());
            expect(after.body.data.orders.map((order: { isDelivery: boolean }) => order.isDelivery)).toEqual([
                true,
                false,
            ]);

            const waiting = await request(app)
                .get("/api/admin/delivery-method-changes?needsRefund=true&limit=100")
                .set(adminHeaders);
            expect(waiting.status).toBe(200);
            expect(waiting.body.data.map((change: { id: string }) => change.id)).toContain(
                downgrade.body.data.change.id,
            );
            const confirmUrl = `/api/admin/delivery-method-changes/${downgrade.body.data.change.id}/confirm-refund`;
            const confirmed = await request(app).post(confirmUrl).set(adminHeaders);
            expect(confirmed.status).toBe(200);
            expect(confirmed.body.data).toMatchObject({ needsRefund: false });
            expect((await request(app).post(confirmUrl).set(adminHeaders)).status).toBe(422);

            const upgrades = await request(app)
                .get(`/api/admin/payments?type=DELIVERY_SERVICE_UPGRADE&userId=${switcherId}`)
                .set(adminHeaders);
            expect(upgrades.body.data.map((item: { id: string }) => item.id)).toEqual([upgrade.body.data.payment.id]);
        });

        it("checks the body, the owner, the start date and the roles", async () => {
            const created = await request(app).post("/api/subscriptions").set(switcher()).send(checkout());
            trackCheckout(created.body);
            const { subscription, payment } = created.body.data;
            const base = `/api/subscriptions/${subscription.id}/delivery-method`;

            expect((await request(app).post(base).set(switcher()).send({ isDelivery: false })).status).toBe(422);
            await request(app).post("/api/webhooks/midtrans").send(midtransNotification(payment.id, payment.amount));

            expect((await request(app).post(base).send({ isDelivery: false })).status).toBe(401);
            expect((await request(app).post(base).set(switcher()).send({ isDelivery: true })).status).toBe(400);
            const today = await request(app)
                .post(base)
                .set(switcher())
                .send({ isDelivery: true, ...pin(), effectiveFrom: new SystemClock().now().toPlainDate().toString() });
            expect(today.status).toBe(400);
            expect(today.body.error.issues).toEqual([expect.objectContaining({ path: "effectiveFrom" })]);
            expect(
                (
                    await request(app)
                        .post(`${base}/preview`)
                        .set(customer())
                        .send({ isDelivery: true, ...pin() })
                ).status,
            ).toBe(404);
            expect((await request(app).post(base).set(switcher()).send({ isDelivery: false })).status).toBe(422);

            const adminBase = `/api/admin/subscriptions/${subscription.id}/delivery-method`;
            const adminPreview = await request(app)
                .post(`${adminBase}/preview`)
                .set(adminHeaders)
                .send({ isDelivery: true, ...pin() });
            expect(adminPreview.status).toBe(200);
            expect(
                (
                    await request(app)
                        .post(adminBase)
                        .set(switcher())
                        .send({ isDelivery: true, ...pin() })
                ).status,
            ).toBe(403);
            expect((await request(app).get("/api/admin/delivery-method-changes").set(switcher())).status).toBe(403);
            expect(
                (
                    await request(app)
                        .post(`/api/delivery-method-changes/${randomUUID()}/payment-session`)
                        .set(switcher())
                ).status,
            ).toBe(404);
        });
    });
});

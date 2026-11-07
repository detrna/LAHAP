import { describe, expect, it } from "vitest";
import { buildPackage } from "../../../catalog/test-utils/factory/catalog.factory.js";
import { buildSettings } from "../../../settings/test-utils/factory/settings.factory.js";
import { ValidationError } from "../../../../shared/errors/validation-error.js";
import {
    buildOrderRecord,
    buildPaymentRecord,
    buildSubscriptionRecord,
} from "../../test-utils/factory/orders.factory.js";
import type { MethodChangeWrite, OrderRecord } from "../interfaces/orders.repository.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";
import type { MethodChangeInput } from "./method-change-input.js";

const NOW = "2026-11-10T10:00:00+07:00[Asia/Jakarta]";
const KITCHEN = { latitude: -7.9666, longitude: 112.6326 };
const SUBSCRIPTION_ID = "30000000-0000-4000-8000-000000000001";
const PACKAGE_ID = "10000000-0000-4000-8000-000000000001";
const CUSTOMER = { userId: "user-1", asAdmin: false };

const slot = (id: string, date: string, overrides: Partial<OrderRecord> = {}) =>
    buildOrderRecord({
        id,
        subscriptionId: SUBSCRIPTION_ID,
        serviceDate: Temporal.PlainDate.from(date),
        ...overrides,
    });

const delivered = (overrides: Partial<OrderRecord> = {}) => ({ isDelivery: true, deliveryFee: 4000, ...overrides });

const toPickup = (overrides: Partial<MethodChangeInput> = {}): MethodChangeInput => ({
    isDelivery: false,
    deliveryAddress: null,
    deliveryLatitude: null,
    deliveryLongitude: null,
    paymentMethod: "MIDTRANS",
    ...overrides,
});

const toDelivery = (overrides: Partial<MethodChangeInput> = {}): MethodChangeInput => ({
    isDelivery: true,
    deliveryAddress: "Jl. Ijen",
    deliveryLatitude: KITCHEN.latitude + 0.05,
    deliveryLongitude: KITCHEN.longitude,
    paymentMethod: "MIDTRANS",
    ...overrides,
});

function setup(options: { isDelivery: boolean; purchaseType?: "Online" | "Offline"; courierId?: string | null }) {
    const context = setupOrdersService(NOW);
    const subscription = buildSubscriptionRecord({
        id: SUBSCRIPTION_ID,
        userId: "user-1",
        packageId: PACKAGE_ID,
        status: "Success",
        purchaseType: options.purchaseType ?? "Online",
        isDelivery: options.isDelivery,
        startDate: Temporal.PlainDate.from("2026-11-09"),
        endDate: Temporal.PlainDate.from("2026-11-13"),
    });
    const method = options.isDelivery ? delivered({ courierId: options.courierId ?? null }) : {};
    const orders = [
        slot("past", "2026-11-09", { ...method, status: "Selesai" }),
        slot("today", "2026-11-10", { ...method, status: "Disiapkan" }),
        slot("b", "2026-11-11", method),
        slot("c", "2026-11-12", method),
        slot("d", "2026-11-13", method),
    ];
    context.repository.findSubscriptionById.mockResolvedValue(subscription);
    context.repository.findOrdersBySubscriptionId.mockResolvedValue(orders);
    context.settings.getSettings.mockResolvedValue(
        buildSettings({ ...KITCHEN, deliveryFreeRadius: 3, deliveryMaxDistance: 10, deliveryPricePerKm: 1000 }),
    );
    context.catalog.getPackagesByIds.mockResolvedValue([
        buildPackage({ id: PACKAGE_ID, deliveryFreeRadius: null, deliveryMaxDistance: null, deliveryPricePerKm: null }),
    ]);
    context.repository.createMethodChange.mockImplementation(async (write: MethodChangeWrite) => ({
        change: {
            ...write.change,
            refundedAt: null,
            paymentId: write.payment?.id ?? null,
            slots: write.slots.map(link => ({
                ...link,
                serviceDate: orders.find(order => order.id === link.orderId)!.serviceDate,
            })),
            createdAt: Temporal.PlainDateTime.from("2026-11-10T03:00:00"),
            updatedAt: Temporal.PlainDateTime.from("2026-11-10T03:00:00"),
        },
        payment:
            write.payment === null
                ? null
                : buildPaymentRecord({
                      ...write.payment,
                      subscriptionId: SUBSCRIPTION_ID,
                      userId: "user-1",
                      type: "DELIVERY_SERVICE_UPGRADE",
                      createdAt: Temporal.PlainDateTime.from("2026-11-10T03:00:00"),
                  }),
        subscription: { ...subscription, isDelivery: write.apply ? write.change.toDelivery : subscription.isDelivery },
        slotsBefore: orders.filter(order => write.slots.some(link => link.orderId === order.id)),
    }));
    return { ...context, subscription, orders };
}

const writeOf = (repository: ReturnType<typeof setup>["repository"]) =>
    repository.createMethodChange.mock.calls[0]![0] as MethodChangeWrite;

describe("OrdersService.previewMethodChange (unit)", () => {
    it("quotes a switch to pick-up as the refund of each switched slot's fee", async () => {
        const { service, repository } = setup({ isDelivery: true });

        expect(await service.previewMethodChange(CUSTOMER, SUBSCRIPTION_ID, toPickup())).toEqual({
            toDelivery: false,
            effectiveFrom: "2026-11-11",
            slots: [
                { orderId: "b", serviceDate: "2026-11-11", fee: 4000 },
                { orderId: "c", serviceDate: "2026-11-12", fee: 4000 },
                { orderId: "d", serviceDate: "2026-11-13", fee: 4000 },
            ],
            slotCount: 3,
            deliveryFeePerSlot: 0,
            amount: 12000,
            delivery: null,
        });
        expect(repository.createMethodChange).not.toHaveBeenCalled();
    });

    it("quotes a switch to delivery at today's rates from the chosen date", async () => {
        const { service } = setup({ isDelivery: false });

        const preview = await service.previewMethodChange(
            CUSTOMER,
            SUBSCRIPTION_ID,
            toDelivery({ effectiveFrom: Temporal.PlainDate.from("2026-11-12") }),
        );

        expect(preview).toMatchObject({
            toDelivery: true,
            effectiveFrom: "2026-11-12",
            slotCount: 2,
            delivery: { available: true, distanceKm: 6, maxDistanceKm: 10, feePerSlot: 3000 },
            deliveryFeePerSlot: 3000,
            amount: 6000,
        });
    });

    it("tells that delivery isn't available past the max distance without failing", async () => {
        const { service } = setup({ isDelivery: false });

        const preview = await service.previewMethodChange(
            CUSTOMER,
            SUBSCRIPTION_ID,
            toDelivery({ deliveryLatitude: KITCHEN.latitude + 0.2 }),
        );

        expect(preview.delivery).toMatchObject({ available: false });
    });

    it("hides another customer's order but lets an admin see it", async () => {
        const { service } = setup({ isDelivery: true });

        await expect(
            service.previewMethodChange({ userId: "user-2", asAdmin: false }, SUBSCRIPTION_ID, toPickup()),
        ).rejects.toMatchObject({ statusCode: 404, code: "SUBSCRIPTION_NOT_FOUND" });
        await expect(
            service.previewMethodChange({ userId: "admin-1", asAdmin: true }, SUBSCRIPTION_ID, toPickup()),
        ).resolves.toMatchObject({ slotCount: 3 });
    });

    it("refuses an order that isn't paid", async () => {
        const { service, repository, subscription } = setup({ isDelivery: true });
        repository.findSubscriptionById.mockResolvedValue({ ...subscription, status: "Pending" });

        await expect(service.previewMethodChange(CUSTOMER, SUBSCRIPTION_ID, toPickup())).rejects.toMatchObject({
            statusCode: 422,
            message: "subscription is not paid",
        });
    });

    it("refuses a start date that isn't after today", async () => {
        const { service } = setup({ isDelivery: true });

        await expect(
            service.previewMethodChange(
                CUSTOMER,
                SUBSCRIPTION_ID,
                toPickup({ effectiveFrom: Temporal.PlainDate.from("2026-11-10") }),
            ),
        ).rejects.toBeInstanceOf(ValidationError);
    });
});

describe("OrdersService.changeDeliveryMethod (unit)", () => {
    describe("to pick-up", () => {
        it("switches at once, records the refund and tells the customer, admins and the courier", async () => {
            const { service, repository, notifier, paymentGateway } = setup({ isDelivery: true, courierId: "c-1" });

            const result = await service.changeDeliveryMethod(CUSTOMER, SUBSCRIPTION_ID, toPickup());

            const write = writeOf(repository);
            expect(write).toMatchObject({
                change: {
                    subscriptionId: SUBSCRIPTION_ID,
                    requestedById: "user-1",
                    toDelivery: false,
                    effectiveFrom: Temporal.PlainDate.from("2026-11-11"),
                    status: "Success",
                    slotCount: 3,
                    deliveryFeePerSlot: 0,
                    amount: 12000,
                    needsRefund: true,
                },
                slots: [
                    { orderId: "b", fee: 4000 },
                    { orderId: "c", fee: 4000 },
                    { orderId: "d", fee: 4000 },
                ],
                payment: null,
                apply: true,
            });
            expect(paymentGateway.createTransaction).not.toHaveBeenCalled();
            expect(result).toMatchObject({
                change: { status: "Success", needsRefund: true, amount: 12000, effectiveFrom: "2026-11-11" },
                payment: null,
                paymentSession: null,
            });
            expect(notifier.notifyUser).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
            expect(notifier.notifyUser).toHaveBeenCalledWith(expect.objectContaining({ userId: "c-1" }));
            expect(notifier.notifyAdmins).toHaveBeenCalledTimes(1);
        });

        it("asks for no refund when the switched slots cost nothing to deliver", async () => {
            const { service, repository, notifier } = setup({ isDelivery: true });
            repository.findOrdersBySubscriptionId.mockResolvedValue([
                slot("b", "2026-11-11", delivered({ deliveryFee: 0 })),
            ]);

            await service.changeDeliveryMethod(CUSTOMER, SUBSCRIPTION_ID, toPickup());

            expect(writeOf(repository).change).toMatchObject({ amount: 0, needsRefund: false });
            expect(notifier.notifyAdmins).not.toHaveBeenCalled();
        });

        it("still answers when a notification fails", async () => {
            const { service, notifier, logger } = setup({ isDelivery: true });
            notifier.notifyUser.mockRejectedValue(new Error("down"));

            await expect(service.changeDeliveryMethod(CUSTOMER, SUBSCRIPTION_ID, toPickup())).resolves.toBeDefined();
            expect(logger.warn).toHaveBeenCalled();
        });
    });

    describe("to delivery", () => {
        it("opens a Midtrans payment for the fee and leaves the slots until it is paid", async () => {
            const { service, repository, paymentGateway, cache, notifier } = setup({ isDelivery: false });

            const result = await service.changeDeliveryMethod(CUSTOMER, SUBSCRIPTION_ID, toDelivery());

            const write = writeOf(repository);
            expect(paymentGateway.createTransaction).toHaveBeenCalledWith({
                orderId: write.payment!.id,
                grossAmount: 9000,
                expiryMinutes: 15,
            });
            expect(write).toMatchObject({
                change: {
                    toDelivery: true,
                    status: "Pending",
                    slotCount: 3,
                    deliveryFeePerSlot: 3000,
                    amount: 9000,
                    needsRefund: false,
                    deliveryAddress: "Jl. Ijen",
                    deliveryLatitude: KITCHEN.latitude + 0.05,
                    deliveryLongitude: KITCHEN.longitude,
                    deliveryDistanceKm: 6,
                },
                payment: { method: "MIDTRANS", amount: 9000, status: "Pending", paidAt: null },
                apply: false,
            });
            expect(cache.set).toHaveBeenCalledWith(`payment-session:${write.payment!.id}`, expect.any(String), {
                ttlSeconds: 900,
            });
            expect(result.paymentSession).toEqual({
                snapToken: "snap-token",
                redirectUrl: "https://pay.test/snap",
                expiresAt: "2026-11-10T10:15:00.000+07:00",
            });
            expect(result.payment).toMatchObject({ type: "DELIVERY_SERVICE_UPGRADE", status: "Pending" });
            expect(notifier.notifyUser).not.toHaveBeenCalled();
        });

        it("refuses a pin past the max distance before opening a payment", async () => {
            const { service, repository, paymentGateway } = setup({ isDelivery: false });

            await expect(
                service.changeDeliveryMethod(
                    CUSTOMER,
                    SUBSCRIPTION_ID,
                    toDelivery({ deliveryLatitude: KITCHEN.latitude + 0.2 }),
                ),
            ).rejects.toMatchObject({ statusCode: 422, message: "delivery is not available for this address" });
            expect(paymentGateway.createTransaction).not.toHaveBeenCalled();
            expect(repository.createMethodChange).not.toHaveBeenCalled();
        });

        it("takes cash only for an offline order", async () => {
            const online = setup({ isDelivery: false });
            await expect(
                online.service.changeDeliveryMethod(CUSTOMER, SUBSCRIPTION_ID, toDelivery({ paymentMethod: "CASH" })),
            ).rejects.toMatchObject({ statusCode: 422, message: "online orders cannot be paid in cash" });

            const offline = setup({ isDelivery: false, purchaseType: "Offline" });
            const result = await offline.service.changeDeliveryMethod(
                { userId: "admin-1", asAdmin: true },
                SUBSCRIPTION_ID,
                toDelivery({ paymentMethod: "CASH" }),
            );
            expect(offline.paymentGateway.createTransaction).not.toHaveBeenCalled();
            expect(writeOf(offline.repository)).toMatchObject({
                change: { requestedById: "admin-1", status: "Pending" },
                payment: { method: "CASH", status: "Pending" },
                apply: false,
            });
            expect(result.paymentSession).toBeNull();
        });

        it("applies at once when every switched slot is inside the free radius", async () => {
            const { service, repository, paymentGateway, notifier } = setup({ isDelivery: false });

            await service.changeDeliveryMethod(
                CUSTOMER,
                SUBSCRIPTION_ID,
                toDelivery({ deliveryLatitude: KITCHEN.latitude + 0.01 }),
            );

            expect(paymentGateway.createTransaction).not.toHaveBeenCalled();
            expect(writeOf(repository)).toMatchObject({
                change: { status: "Success", amount: 0, deliveryFeePerSlot: 0 },
                payment: null,
                apply: true,
            });
            expect(notifier.notifyUser).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
            expect(notifier.notifyAdmins).toHaveBeenCalledTimes(1);
        });

        it("writes nothing when the gateway fails", async () => {
            const { service, repository, paymentGateway } = setup({ isDelivery: false });
            paymentGateway.createTransaction.mockRejectedValue(new Error("gateway down"));

            await expect(service.changeDeliveryMethod(CUSTOMER, SUBSCRIPTION_ID, toDelivery())).rejects.toThrow(
                "gateway down",
            );
            expect(repository.createMethodChange).not.toHaveBeenCalled();
        });
    });
});

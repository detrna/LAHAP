import { describe, expect, it } from "vitest";
import { buildMenu, buildPackage, buildScheduleSummary } from "../../../catalog/test-utils/factory/catalog.factory.js";
import { buildSettings } from "../../../settings/test-utils/factory/settings.factory.js";
import type { CheckoutWrite } from "../interfaces/orders.repository.js";
import {
    buildOrderRecord,
    buildPaymentRecord,
    buildSubscriptionRecord,
} from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";
import type { CheckoutInput } from "./checkout-input.js";

const NOW = "2026-11-06T10:00:00+07:00[Asia/Jakarta]";
const KITCHEN = { latitude: -7.9666, longitude: 112.6326 };
const PACKAGE_ID = "10000000-0000-4000-8000-000000000001";
const MENU_ID = "20000000-0000-4000-8000-000000000001";
const SLOT = buildScheduleSummary({
    id: "40000000-0000-4000-8000-000000000001",
    packageId: PACKAGE_ID,
    date: "2026-11-09",
    deliveryTime: { time: "12:00", range: "Siang" },
    isPublished: true,
    primaryMenuId: MENU_ID,
});

const input = (overrides: Partial<CheckoutInput> = {}): CheckoutInput =>
    ({
        period: "Harian",
        menuScheduleIds: [SLOT.id],
        packageId: PACKAGE_ID,
        purchaseType: "Online",
        isDelivery: false,
        recipientName: "Budi",
        deliveryAddress: null,
        deliveryLatitude: null,
        deliveryLongitude: null,
        notes: null,
        promoCode: null,
        paymentMethod: "MIDTRANS",
        ...overrides,
    }) as CheckoutInput;

function setup() {
    const context = setupOrdersService(NOW);
    context.settings.getSettings.mockResolvedValue(
        buildSettings({ ...KITCHEN, deliveryFreeRadius: 3, deliveryMaxDistance: 10, paymentTimeoutMinutes: 15 }),
    );
    context.catalog.getPackagesByIds.mockResolvedValue([
        buildPackage({ id: PACKAGE_ID, basePrice: 15000, periods: ["Harian"], isAvailable: true }),
    ]);
    context.catalog.findSchedules.mockResolvedValue([SLOT]);
    context.catalog.getMenusByIds.mockResolvedValue([buildMenu({ id: MENU_ID, allergies: [] })]);
    context.repository.createCheckout.mockImplementation(async (write: CheckoutWrite) => ({
        subscription: buildSubscriptionRecord({ ...write.subscription }),
        payment: buildPaymentRecord({
            ...write.payment,
            subscriptionId: write.subscription.id,
            createdAt: Temporal.PlainDateTime.from("2026-11-06T03:00:00"),
        }),
        orders: write.slots.map(slot => buildOrderRecord({ ...slot, subscriptionId: write.subscription.id })),
    }));
    return context;
}

describe("OrdersService.createSubscription (unit)", () => {
    it("opens a Midtrans transaction, saves the pending order and keeps the Snap session", async () => {
        const { service, paymentGateway, repository, cache } = setup();

        const result = await service.createSubscription("user-1", input());

        const [payment, subscription] = [
            "00000000-0000-4000-8000-000000000002",
            "00000000-0000-4000-8000-000000000001",
        ];
        expect(paymentGateway.createTransaction).toHaveBeenCalledWith({
            orderId: payment,
            grossAmount: 15000,
            expiryMinutes: 15,
        });
        const write = repository.createCheckout.mock.calls[0]![0] as CheckoutWrite;
        expect(write.subscription).toMatchObject({
            id: subscription,
            userId: "user-1",
            status: "Pending",
            startDate: Temporal.PlainDate.from("2026-11-09"),
            totalPrice: 15000,
            deliveryAddress: null,
        });
        expect(write.slots).toEqual([
            {
                id: "00000000-0000-4000-8000-000000000003",
                menuScheduleId: SLOT.id,
                serviceDate: Temporal.PlainDate.from("2026-11-09"),
                isDelivery: false,
                deliveryFee: 0,
            },
        ]);
        expect(write.payment).toEqual({
            id: payment,
            method: "MIDTRANS",
            amount: 15000,
            status: "Pending",
            paidAt: null,
        });
        expect(write.promo).toBeNull();
        expect(result.paymentSession).toEqual({
            snapToken: "snap-token",
            redirectUrl: "https://pay.test/snap",
            expiresAt: "2026-11-06T10:15:00.000+07:00",
        });
        expect(cache.set).toHaveBeenCalledWith(`payment-session:${payment}`, JSON.stringify(result.paymentSession), {
            ttlSeconds: 900,
        });
        expect(result.payment.doneOnline).toBe(true);
        expect(result.subscription.displayStatus).toBeNull();
    });

    it("saves a cash order without calling the gateway", async () => {
        const { service, paymentGateway, repository } = setup();

        const result = await service.createSubscription(
            "user-1",
            input({ purchaseType: "Offline", paymentMethod: "CASH" }),
        );

        expect(paymentGateway.createTransaction).not.toHaveBeenCalled();
        expect((repository.createCheckout.mock.calls[0]![0] as CheckoutWrite).payment.method).toBe("CASH");
        expect(result.paymentSession).toBeNull();
        expect(result.payment.doneOnline).toBe(false);
    });

    it("refuses cash for an online order", async () => {
        const { service, repository } = setup();

        await expect(service.createSubscription("user-1", input({ paymentMethod: "CASH" }))).rejects.toMatchObject({
            statusCode: 422,
            message: "online orders cannot be paid in cash",
        });
        expect(repository.createCheckout).not.toHaveBeenCalled();
    });

    it("refuses delivery to a pin past the max distance", async () => {
        const { service, paymentGateway } = setup();

        await expect(
            service.createSubscription(
                "user-1",
                input({
                    isDelivery: true,
                    deliveryAddress: "Jauh",
                    deliveryLatitude: KITCHEN.latitude + 0.2,
                    deliveryLongitude: KITCHEN.longitude,
                }),
            ),
        ).rejects.toMatchObject({ statusCode: 422, message: "delivery is not available for this address" });
        expect(paymentGateway.createTransaction).not.toHaveBeenCalled();
    });

    it("snapshots the delivery point and distance for delivery orders", async () => {
        const { service, repository } = setup();

        await service.createSubscription(
            "user-1",
            input({
                isDelivery: true,
                deliveryAddress: "Jl. Ijen",
                deliveryLatitude: KITCHEN.latitude,
                deliveryLongitude: KITCHEN.longitude,
            }),
        );

        expect((repository.createCheckout.mock.calls[0]![0] as CheckoutWrite).subscription).toMatchObject({
            deliveryAddress: "Jl. Ijen",
            deliveryLatitude: KITCHEN.latitude,
            deliveryDistanceKm: 0,
        });
    });

    it("gives every slot of a delivery order its method and the fee per slot", async () => {
        const { service, repository } = setup();

        await service.createSubscription(
            "user-1",
            input({
                isDelivery: true,
                deliveryAddress: "Jl. Ijen",
                deliveryLatitude: KITCHEN.latitude + 0.05,
                deliveryLongitude: KITCHEN.longitude,
            }),
        );

        const write = repository.createCheckout.mock.calls[0]![0] as CheckoutWrite;
        expect(write.subscription.deliveryFeePerSlot).toBeGreaterThan(0);
        expect(write.slots).toEqual([
            expect.objectContaining({ isDelivery: true, deliveryFee: write.subscription.deliveryFeePerSlot }),
        ]);
    });

    it("writes nothing when the gateway fails", async () => {
        const { service, paymentGateway, repository } = setup();
        paymentGateway.createTransaction.mockRejectedValue(new Error("gateway down"));

        await expect(service.createSubscription("user-1", input())).rejects.toThrow("gateway down");
        expect(repository.createCheckout).not.toHaveBeenCalled();
    });

    it("reserves an applied promo inside the checkout", async () => {
        const { service, promoChecker, repository } = setup();
        promoChecker.checkPromo.mockResolvedValue({
            valid: true,
            promoCode: {
                id: "promo-1",
                code: "MERDEKA",
                discountType: "Nominal",
                discountValue: 5000,
                allowStackWithTier: true,
                quota: 3,
            },
        });

        await service.createSubscription("user-1", input({ promoCode: "MERDEKA" }));

        const write = repository.createCheckout.mock.calls[0]![0] as CheckoutWrite;
        expect(write.subscription).toMatchObject({ promoCodeId: "promo-1", promoDiscount: 5000, totalPrice: 10000 });
        expect(write.promo).toEqual({
            promoCodeId: "promo-1",
            quota: 3,
            useStatuses: ["Pending", "Success"],
            customerUseStatuses: ["Success"],
        });
    });

    it("marks a fully discounted order as paid at once", async () => {
        const { service, promoChecker, paymentGateway, repository, tierDiscounts, notifier } = setup();
        promoChecker.checkPromo.mockResolvedValue({
            valid: true,
            promoCode: {
                id: "promo-1",
                code: "GRATIS",
                discountType: "Persen",
                discountValue: 100,
                allowStackWithTier: true,
                quota: 3,
            },
        });

        const result = await service.createSubscription("user-1", input({ promoCode: "GRATIS" }));

        expect(paymentGateway.createTransaction).not.toHaveBeenCalled();
        const write = repository.createCheckout.mock.calls[0]![0] as CheckoutWrite;
        expect(write.subscription.status).toBe("Success");
        expect(write.payment).toMatchObject({
            method: "FREE",
            amount: 0,
            status: "Success",
            paidAt: Temporal.PlainDateTime.from("2026-11-06T03:00:00"),
        });
        expect(result.paymentSession).toBeNull();
        expect(tierDiscounts.reevaluate).toHaveBeenCalledWith("user-1", { renewWindow: true });
        expect(notifier.notifyUser).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
    });

    it("still answers when the paid follow-ups fail", async () => {
        const { service, promoChecker, tierDiscounts, notifier, logger } = setup();
        promoChecker.checkPromo.mockResolvedValue({
            valid: true,
            promoCode: {
                id: "promo-1",
                code: "GRATIS",
                discountType: "Persen",
                discountValue: 100,
                allowStackWithTier: true,
                quota: 3,
            },
        });
        tierDiscounts.reevaluate.mockRejectedValue(new Error("lock timeout"));
        notifier.notifyUser.mockRejectedValue(new Error("redis down"));

        await expect(service.createSubscription("user-1", input({ promoCode: "GRATIS" }))).resolves.toMatchObject({
            subscription: { status: "Success" },
        });
        expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it("still answers when the Snap session cannot be cached", async () => {
        const { service, cache, logger } = setup();
        cache.set.mockRejectedValue(new Error("redis down"));

        await expect(service.createSubscription("user-1", input())).resolves.toMatchObject({
            paymentSession: { snapToken: "snap-token" },
        });
        expect(logger.warn).toHaveBeenCalled();
    });
});

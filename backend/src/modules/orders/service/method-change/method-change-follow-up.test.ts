import { describe, expect, it } from "vitest";
import {
    buildDeliveryMethodChangeRecord,
    buildPaymentRecord,
    buildSubscriptionRecord,
} from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

const session = { snapToken: "snap", redirectUrl: "https://pay.test/snap", expiresAt: "2026-11-10T10:15:00.000+07:00" };

function setupPending(method: "MIDTRANS" | "CASH" = "MIDTRANS") {
    const context = setupOrdersService("2026-11-10T10:00:00+07:00[Asia/Jakarta]");
    context.repository.findMethodChangeById.mockResolvedValue(
        buildDeliveryMethodChangeRecord({
            id: "chg-1",
            subscriptionId: "sub-1",
            status: "Pending",
            paymentId: "pay-1",
        }),
    );
    context.repository.findSubscriptionById.mockResolvedValue(
        buildSubscriptionRecord({ id: "sub-1", userId: "user-1", status: "Success" }),
    );
    context.repository.findPaymentsBySubscriptionId.mockResolvedValue([
        buildPaymentRecord({ id: "pay-0", status: "Success" }),
        buildPaymentRecord({ id: "pay-1", status: "Pending", method, type: "DELIVERY_SERVICE_UPGRADE" }),
    ]);
    context.cache.get.mockResolvedValue(JSON.stringify(session));
    return context;
}

describe("OrdersService.getMethodChangePaymentSession (unit)", () => {
    it("reopens the Snap session of a pending upgrade", async () => {
        const { service, cache } = setupPending();

        expect(await service.getMethodChangePaymentSession("user-1", "chg-1")).toEqual(session);
        expect(cache.get).toHaveBeenCalledWith("payment-session:pay-1");
    });

    it("hides another customer's change", async () => {
        const { service } = setupPending();

        await expect(service.getMethodChangePaymentSession("user-2", "chg-1")).rejects.toMatchObject({
            statusCode: 404,
            code: "DELIVERY_METHOD_CHANGE_NOT_FOUND",
        });
    });

    it("refuses a change that isn't waiting for an online payment", async () => {
        const settled = setupPending();
        settled.repository.findMethodChangeById.mockResolvedValue(
            buildDeliveryMethodChangeRecord({ subscriptionId: "sub-1", status: "Success", paymentId: "pay-1" }),
        );
        await expect(settled.service.getMethodChangePaymentSession("user-1", "chg-1")).rejects.toMatchObject({
            statusCode: 422,
            message: "delivery method change is not waiting for payment",
        });

        const cash = setupPending("CASH");
        await expect(cash.service.getMethodChangePaymentSession("user-1", "chg-1")).rejects.toMatchObject({
            statusCode: 422,
            message: "cash payments are paid at the cashier",
        });

        const gone = setupPending();
        gone.cache.get.mockResolvedValue(null);
        await expect(gone.service.getMethodChangePaymentSession("user-1", "chg-1")).rejects.toMatchObject({
            statusCode: 422,
            message: "payment session has expired",
        });
    });
});

describe("OrdersService.listMethodChangesForAdmin (unit)", () => {
    it("pages the changes with the refund filter", async () => {
        const { service, repository } = setupOrdersService();
        repository.listMethodChanges.mockResolvedValue({
            items: [buildDeliveryMethodChangeRecord({ id: "chg-1", needsRefund: true })],
            total: 1,
        });

        const page = await service.listMethodChangesForAdmin({ needsRefund: true, skip: 0, take: 20 });

        expect(repository.listMethodChanges).toHaveBeenCalledWith({ needsRefund: true, skip: 0, take: 20 });
        expect(page).toMatchObject({
            total: 1,
            items: [
                { id: "chg-1", needsRefund: true, effectiveFrom: "2026-11-10", slots: [{ serviceDate: "2026-11-10" }] },
            ],
        });
    });
});

describe("OrdersService.confirmMethodChangeRefund (unit)", () => {
    it("confirms a refund that is due", async () => {
        const { service, repository } = setupOrdersService("2026-11-10T10:00:00+07:00[Asia/Jakarta]");
        repository.findMethodChangeById.mockResolvedValue(
            buildDeliveryMethodChangeRecord({ id: "chg-1", needsRefund: true }),
        );
        repository.confirmMethodChangeRefund.mockResolvedValue(
            buildDeliveryMethodChangeRecord({
                id: "chg-1",
                needsRefund: false,
                refundedAt: Temporal.PlainDateTime.from("2026-11-10T03:00:00"),
            }),
        );

        const confirmed = await service.confirmMethodChangeRefund("chg-1");

        expect(repository.confirmMethodChangeRefund).toHaveBeenCalledWith(
            "chg-1",
            Temporal.PlainDateTime.from("2026-11-10T03:00:00"),
        );
        expect(confirmed).toMatchObject({ needsRefund: false, refundedAt: "2026-11-10T10:00:00.000+07:00" });
    });

    it("answers 404 for an unknown change and 422 when nothing is due", async () => {
        const { service, repository } = setupOrdersService();

        await expect(service.confirmMethodChangeRefund("chg-1")).rejects.toMatchObject({ statusCode: 404 });

        repository.findMethodChangeById.mockResolvedValue(buildDeliveryMethodChangeRecord({ needsRefund: false }));
        await expect(service.confirmMethodChangeRefund("chg-1")).rejects.toMatchObject({
            statusCode: 422,
            message: "delivery method change does not need a refund",
        });

        repository.findMethodChangeById.mockResolvedValue(buildDeliveryMethodChangeRecord({ needsRefund: true }));
        repository.confirmMethodChangeRefund.mockResolvedValue(null);
        await expect(service.confirmMethodChangeRefund("chg-1")).rejects.toMatchObject({ statusCode: 422 });
    });
});

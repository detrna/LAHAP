import { describe, expect, it } from "vitest";
import { buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

const BEFORE_CUTOFF = "2026-11-08T23:59:59+07:00[Asia/Jakarta]";
const AFTER_CUTOFF = "2026-11-09T00:00:00+07:00[Asia/Jakarta]";
const record = (status: "Pending" | "Success" | "Expire") =>
    buildSubscriptionRecord({
        id: "sub-1",
        userId: "user-1",
        status,
        startDate: Temporal.PlainDate.from("2026-11-09"),
    });

function setup(now: string, status: "Pending" | "Success" | "Expire") {
    const context = setupOrdersService(now);
    context.repository.findSubscriptionById.mockResolvedValue(record(status));
    context.repository.cancelSubscription.mockImplementation(async ({ needsRefund }) => ({
        ...record(status),
        status: "Dibatalkan",
        needsRefund,
    }));
    return context;
}

describe("OrdersService.cancelSubscription (unit)", () => {
    it("cancels a paid order before the cut-off, flags the refund and re-evaluates the tier", async () => {
        const { service, repository, tierDiscounts, notifier } = setup(BEFORE_CUTOFF, "Success");

        const cancelled = await service.cancelSubscription("user-1", "sub-1");

        expect(repository.cancelSubscription).toHaveBeenCalledWith({
            subscriptionId: "sub-1",
            expectedStatus: "Success",
            needsRefund: true,
            expirePendingPayments: false,
        });
        expect(cancelled).toMatchObject({ status: "Dibatalkan", needsRefund: true });
        expect(tierDiscounts.reevaluate).toHaveBeenCalledWith("user-1", { renewWindow: false });
        expect(notifier.notifyUser).toHaveBeenCalled();
    });

    it("cancels an unpaid order and expires its payment", async () => {
        const { service, repository, tierDiscounts } = setup(BEFORE_CUTOFF, "Pending");

        await service.cancelSubscription("user-1", "sub-1");

        expect(repository.cancelSubscription).toHaveBeenCalledWith(
            expect.objectContaining({ needsRefund: false, expirePendingPayments: true }),
        );
        expect(tierDiscounts.reevaluate).not.toHaveBeenCalled();
    });

    it("refuses after the cut-off", async () => {
        const { service, repository } = setup(AFTER_CUTOFF, "Success");

        await expect(service.cancelSubscription("user-1", "sub-1")).rejects.toMatchObject({
            statusCode: 422,
            message: "cut-off has passed",
        });
        expect(repository.cancelSubscription).not.toHaveBeenCalled();
    });

    it("refuses a closed order", async () => {
        const { service } = setup(BEFORE_CUTOFF, "Expire");

        await expect(service.cancelSubscription("user-1", "sub-1")).rejects.toMatchObject({ statusCode: 422 });
    });

    it("hides another customer's order", async () => {
        const { service } = setup(BEFORE_CUTOFF, "Success");

        await expect(service.cancelSubscription("user-2", "sub-1")).rejects.toMatchObject({ statusCode: 404 });
    });

    it("refuses when the order changed in between", async () => {
        const { service, repository } = setup(BEFORE_CUTOFF, "Pending");
        repository.cancelSubscription.mockResolvedValue(null);

        await expect(service.cancelSubscription("user-1", "sub-1")).rejects.toMatchObject({ statusCode: 422 });
    });
});

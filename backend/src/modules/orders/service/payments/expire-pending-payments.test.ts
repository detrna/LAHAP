import { describe, expect, it } from "vitest";
import { buildSettings } from "../../../settings/test-utils/factory/settings.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService.expirePendingPayments (unit)", () => {
    it("expires the payments older than the current timeout", async () => {
        const { service, repository, settings } = setupOrdersService("2026-11-06T10:00:00+07:00[Asia/Jakarta]");
        settings.getSettings.mockResolvedValue(buildSettings({ paymentTimeoutMinutes: 20 }));
        repository.expirePendingPayments.mockResolvedValue([{ paymentId: "pay-1", subscriptionId: "sub-1" }]);

        expect(await service.expirePendingPayments()).toEqual({ expiredCount: 1 });
        expect(repository.expirePendingPayments).toHaveBeenCalledWith(
            Temporal.PlainDateTime.from("2026-11-06T02:40:00"),
        );
    });
});

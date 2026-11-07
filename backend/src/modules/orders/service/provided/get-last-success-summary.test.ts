import { describe, expect, it } from "vitest";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService.getLastSuccessSummary (unit)", () => {
    it("answers the user's summary", async () => {
        const { repository, service } = setupOrdersService();
        const summary = {
            userId: "a",
            lastEndDate: Temporal.PlainDate.from("2026-10-01"),
            lastPackageId: "p1",
            totalSubscriptions: 1,
        };
        repository.findLastSuccessSummaries.mockResolvedValue([summary]);

        expect(await service.getLastSuccessSummary("a")).toEqual(summary);
        expect(repository.findLastSuccessSummaries).toHaveBeenCalledWith(["a"]);
    });

    it("answers null for a user without a paid order", async () => {
        const { service } = setupOrdersService();

        expect(await service.getLastSuccessSummary("a")).toBeNull();
    });
});

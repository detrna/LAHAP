import { describe, expect, it } from "vitest";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

const date = (value: string) => Temporal.PlainDate.from(value);

describe("OrdersService.findChurnedCustomers (unit)", () => {
    it("loads the summaries of the users whose last paid order ended before the cut-off", async () => {
        const { repository, service } = setupOrdersService();
        const summary = { userId: "a", lastEndDate: date("2026-10-01"), lastPackageId: "p1", totalSubscriptions: 2 };
        repository.findUserIdsWithLastSuccessEndBefore.mockResolvedValue(["a"]);
        repository.findLastSuccessSummaries.mockResolvedValue([summary]);

        expect(await service.findChurnedCustomers(date("2026-10-24"))).toEqual([summary]);
        expect(repository.findUserIdsWithLastSuccessEndBefore).toHaveBeenCalledWith(date("2026-10-24"));
        expect(repository.findLastSuccessSummaries).toHaveBeenCalledWith(["a"]);
    });

    it("skips the summaries when nobody is churned", async () => {
        const { repository, service } = setupOrdersService();

        expect(await service.findChurnedCustomers(date("2026-10-24"))).toEqual([]);
        expect(repository.findLastSuccessSummaries).not.toHaveBeenCalled();
    });
});

import { describe, expect, it } from "vitest";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService order stats (unit)", () => {
    it("counts the paid service days of a customer", async () => {
        const { service, repository } = setupOrdersService();
        repository.countPaidServiceDays.mockResolvedValue(12);

        expect(await service.countPaidServiceDays("user-1")).toBe(12);
        expect(repository.countPaidServiceDays).toHaveBeenCalledWith("user-1", ["Success"]);
    });

    it("sums paid tier discounts once per distinct tier", async () => {
        const { service, repository } = setupOrdersService();
        const totals = new Map([["silver", 7500]]);
        repository.sumTierDiscounts.mockResolvedValue(totals);

        expect(await service.sumTierDiscounts(["silver", "silver"])).toBe(totals);
        expect(repository.sumTierDiscounts).toHaveBeenCalledWith(["silver"], ["Success"]);
        expect((await service.sumTierDiscounts([])).size).toBe(0);
    });
});

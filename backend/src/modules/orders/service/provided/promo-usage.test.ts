import { describe, expect, it } from "vitest";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService promo usage (unit)", () => {
    it("counts pending and paid uses per code, once per distinct id", async () => {
        const { service, repository } = setupOrdersService();
        const uses = new Map([["promo-1", 2]]);
        repository.countPromoUses.mockResolvedValue(uses);

        expect(await service.countPromoUses(["promo-1", "promo-1"])).toBe(uses);
        expect(repository.countPromoUses).toHaveBeenCalledWith(["promo-1"], ["Pending", "Success"]);
        expect((await service.countPromoUses([])).size).toBe(0);
        expect(repository.countPromoUses).toHaveBeenCalledTimes(1);
    });

    it("counts only a customer's paid uses", async () => {
        const { service, repository } = setupOrdersService();
        repository.countPromoUsesByUser.mockResolvedValue(1);

        expect(await service.countPromoUsesByUser("promo-1", "user-1")).toBe(1);
        expect(repository.countPromoUsesByUser).toHaveBeenCalledWith("promo-1", "user-1", ["Success"]);
    });

    it("looks for pending subscriptions with the code", async () => {
        const { service, repository } = setupOrdersService();
        repository.hasSubscriptionsWithPromo.mockResolvedValue(true);

        expect(await service.hasPendingSubscriptions("promo-1")).toBe(true);
        expect(repository.hasSubscriptionsWithPromo).toHaveBeenCalledWith("promo-1", ["Pending"]);
    });
});

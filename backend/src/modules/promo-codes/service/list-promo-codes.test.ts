import { describe, expect, it } from "vitest";
import { buildPromoCodeRecord } from "../test-utils/factory/promo-codes.factory.js";
import { setupPromoCodesService } from "../test-utils/setup/promo-codes.setup.js";

describe("PromoCodesService.listPromoCodes (unit)", () => {
    it("passes the filters and counts the uses once for the whole page", async () => {
        const { promoUsage, repository, service } = setupPromoCodesService();
        repository.listPromoCodes.mockResolvedValue({
            items: [buildPromoCodeRecord({ id: "a" }), buildPromoCodeRecord({ id: "b" })],
            total: 7,
        });
        promoUsage.countPromoUses.mockResolvedValue(new Map([["a", 4]]));

        const page = await service.listPromoCodes({ search: "hem", isActive: true, skip: 10, take: 5 });

        expect(repository.listPromoCodes).toHaveBeenCalledWith({ search: "hem", isActive: true, skip: 10, take: 5 });
        expect(promoUsage.countPromoUses).toHaveBeenCalledTimes(1);
        expect(promoUsage.countPromoUses).toHaveBeenCalledWith(["a", "b"]);
        expect(page.total).toBe(7);
        expect(page.items.map(item => [item.id, item.usedCount])).toEqual([
            ["a", 4],
            ["b", 0],
        ]);
    });

    it("skips the usage lookup for an empty page", async () => {
        const { promoUsage, service } = setupPromoCodesService();

        expect(await service.listPromoCodes({ skip: 0, take: 20 })).toEqual({ items: [], total: 0 });
        expect(promoUsage.countPromoUses).not.toHaveBeenCalled();
    });
});

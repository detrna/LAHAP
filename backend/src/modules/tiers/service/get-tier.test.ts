import { describe, expect, it } from "vitest";
import { buildTierRecord } from "../test-utils/factory/tiers.factory.js";
import { setupTiersService } from "../test-utils/setup/tiers.setup.js";
import { TierNotFoundError } from "./interfaces/tiers.repository.js";

describe("TiersService.getTier (unit)", () => {
    it("gives the tier with its admin counts", async () => {
        const { orderStats, repository, service } = setupTiersService();
        const record = buildTierRecord({ id: "gold" });
        repository.findTierById.mockResolvedValue(record);
        repository.listAllTiers.mockResolvedValue([record]);
        orderStats.sumTierDiscounts.mockResolvedValue(new Map([["gold", 500]]));

        expect(await service.getTier("gold")).toMatchObject({
            id: "gold",
            name: "Gold",
            memberCount: 0,
            totalDiscountGiven: 500,
        });
    });

    it("throws TierNotFoundError when the tier is missing", async () => {
        const { service } = setupTiersService();

        await expect(service.getTier("missing")).rejects.toBeInstanceOf(TierNotFoundError);
    });
});

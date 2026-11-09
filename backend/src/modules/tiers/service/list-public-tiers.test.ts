import { describe, expect, it } from "vitest";
import { buildTierRecord } from "../test-utils/factory/tiers.factory.js";
import { setupTiersService } from "../test-utils/setup/tiers.setup.js";

const BIASA = buildTierRecord({ id: "biasa", name: "Biasa", requiredSubscriptionDays: 0, discountPercent: 0 });
const SILVER = buildTierRecord({
    id: "silver",
    name: "Silver",
    requiredSubscriptionDays: 30,
    discountPercent: 5,
    photoKey: "tiers/s.webp",
});
const GOLD = buildTierRecord({ id: "gold", name: "Gold", requiredSubscriptionDays: 60, discountPercent: 10 });

describe("TiersService.listPublicTiers (unit)", () => {
    it("returns every tier in the repository's threshold order with signed badges", async () => {
        const { objectStorage, repository, service } = setupTiersService();
        repository.listAllTiers.mockResolvedValue([BIASA, SILVER, GOLD]);

        const tiers = await service.listPublicTiers();

        expect(tiers.map(tier => tier.id)).toEqual(["biasa", "silver", "gold"]);
        expect(tiers[1]).toMatchObject({
            name: "Silver",
            requiredSubscriptionDays: 30,
            discountPercent: 5,
            photoKey: "tiers/s.webp",
            photoUrl: "https://storage.test/tiers/s.webp?signed",
        });
        expect(tiers[0]?.photoUrl).toBeNull();
        expect(objectStorage.getSignedUrl).toHaveBeenCalledTimes(1);
    });

    it("leaves out the admin-only stats and never reads order or membership data", async () => {
        const { orderStats, repository, service } = setupTiersService();
        repository.listAllTiers.mockResolvedValue([SILVER]);

        const [tier] = await service.listPublicTiers();

        expect(tier).not.toHaveProperty("memberCount");
        expect(tier).not.toHaveProperty("totalDiscountGiven");
        expect(orderStats.sumTierDiscounts).not.toHaveBeenCalled();
        expect(orderStats.countPaidServiceDays).not.toHaveBeenCalled();
        expect(repository.listMembershipWindows).not.toHaveBeenCalled();
    });

    it("returns an empty list without signing anything when there are no tiers", async () => {
        const { objectStorage, service } = setupTiersService();

        expect(await service.listPublicTiers()).toEqual([]);
        expect(objectStorage.getSignedUrl).not.toHaveBeenCalled();
    });
});

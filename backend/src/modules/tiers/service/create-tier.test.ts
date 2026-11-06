import { describe, expect, it } from "vitest";
import { buildTierRecord } from "../test-utils/factory/tiers.factory.js";
import { setupTiersService } from "../test-utils/setup/tiers.setup.js";
import { TierAlreadyExistsError } from "./interfaces/tiers.repository.js";

function setup() {
    const context = setupTiersService();
    context.repository.createTier.mockImplementation(async record =>
        buildTierRecord({ id: "new", ...record, photoKey: record.photoKey }),
    );
    return context;
}

describe("TiersService.createTier (unit)", () => {
    it("fills the defaults: 30 days, no description, no photo", async () => {
        const { photoKeys, repository, service } = setup();

        const tier = await service.createTier({ name: "Platinum", requiredSubscriptionDays: 90, discountPercent: 15 });

        expect(repository.createTier).toHaveBeenCalledWith({
            name: "Platinum",
            description: null,
            requiredSubscriptionDays: 90,
            durationDays: 30,
            discountPercent: 15,
            photoKey: null,
        });
        expect(tier).toMatchObject({ id: "new", name: "Platinum", memberCount: 0, totalDiscountGiven: 0 });
        expect(photoKeys.assertPhotoKeyExists).not.toHaveBeenCalled();
    });

    it("checks a photo key on the photoKey path", async () => {
        const { photoKeys, service } = setup();

        const tier = await service.createTier({
            name: "Platinum",
            requiredSubscriptionDays: 90,
            discountPercent: 15,
            photoKey: "tiers/2026/11/a.webp",
        });

        expect(photoKeys.assertPhotoKeyExists).toHaveBeenCalledWith("tiers/2026/11/a.webp", "photoKey");
        expect(tier.photoUrl).toBe("https://storage.test/tiers/2026/11/a.webp?signed");
    });

    it("does not write when the photo is missing", async () => {
        const { photoKeys, repository, service } = setup();
        photoKeys.assertPhotoKeyExists.mockRejectedValue(new Error("photo_not_found"));

        await expect(
            service.createTier({
                name: "Platinum",
                requiredSubscriptionDays: 90,
                discountPercent: 15,
                photoKey: "tiers/missing.webp",
            }),
        ).rejects.toThrow("photo_not_found");
        expect(repository.createTier).not.toHaveBeenCalled();
    });

    it("lets a conflict from the repository through", async () => {
        const { repository, service } = setup();
        repository.createTier.mockRejectedValue(new TierAlreadyExistsError("name"));

        await expect(
            service.createTier({ name: "Gold", requiredSubscriptionDays: 90, discountPercent: 15 }),
        ).rejects.toBeInstanceOf(TierAlreadyExistsError);
    });
});

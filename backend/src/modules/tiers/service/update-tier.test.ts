import { describe, expect, it } from "vitest";
import { buildTierRecord } from "../test-utils/factory/tiers.factory.js";
import { setupTiersService } from "../test-utils/setup/tiers.setup.js";
import { TierAlreadyExistsError, TierNotFoundError } from "./interfaces/tiers.repository.js";

const EXISTING = buildTierRecord({ id: "gold", photoKey: "tiers/2026/11/old.webp" });

function setup() {
    const context = setupTiersService();
    context.repository.findTierById.mockResolvedValue(EXISTING);
    context.repository.updateTier.mockResolvedValue(EXISTING);
    return context;
}

describe("TiersService.updateTier (unit)", () => {
    it("throws TierNotFoundError when the tier is missing", async () => {
        const { repository, service } = setupTiersService();

        await expect(service.updateTier("missing", { name: "x" })).rejects.toBeInstanceOf(TierNotFoundError);
        expect(repository.updateTier).not.toHaveBeenCalled();
    });

    it("throws TierNotFoundError when the tier vanishes before the write", async () => {
        const { repository, service } = setup();
        repository.updateTier.mockResolvedValue(null);

        await expect(service.updateTier("gold", { name: "x" })).rejects.toBeInstanceOf(TierNotFoundError);
    });

    it("sends only the given fields", async () => {
        const { repository, service } = setup();

        await service.updateTier("gold", { discountPercent: 12, description: null });

        expect(repository.updateTier).toHaveBeenCalledWith("gold", { discountPercent: 12, description: null });
    });

    it("checks a new photo key on the photoKey path", async () => {
        const { photoKeys, service } = setup();

        await service.updateTier("gold", { photoKey: "tiers/2026/11/new.webp" });

        expect(photoKeys.assertPhotoKeyExists).toHaveBeenCalledWith("tiers/2026/11/new.webp", "photoKey");
    });

    it("skips the check for the stored key and for null", async () => {
        const { photoKeys, repository, service } = setup();

        await service.updateTier("gold", { photoKey: "tiers/2026/11/old.webp" });
        await service.updateTier("gold", { photoKey: null });

        expect(photoKeys.assertPhotoKeyExists).not.toHaveBeenCalled();
        expect(repository.updateTier).toHaveBeenLastCalledWith("gold", { photoKey: null });
    });

    it("lets a conflict from the repository through", async () => {
        const { repository, service } = setup();
        repository.updateTier.mockRejectedValue(new TierAlreadyExistsError("requiredSubscriptionDays"));

        await expect(service.updateTier("gold", { requiredSubscriptionDays: 30 })).rejects.toBeInstanceOf(
            TierAlreadyExistsError,
        );
    });
});

import { describe, expect, it } from "vitest";
import { setupTiersService } from "../test-utils/setup/tiers.setup.js";
import { TierNotFoundError } from "./interfaces/tiers.repository.js";

describe("TiersService.deleteTier (unit)", () => {
    it("deletes through the repository", async () => {
        const { repository, service } = setupTiersService();
        repository.deleteTier.mockResolvedValue(true);

        await expect(service.deleteTier("gold")).resolves.toBeUndefined();
        expect(repository.deleteTier).toHaveBeenCalledWith("gold");
    });

    it("throws TierNotFoundError when nothing was deleted", async () => {
        const { service } = setupTiersService();

        await expect(service.deleteTier("missing")).rejects.toBeInstanceOf(TierNotFoundError);
    });
});

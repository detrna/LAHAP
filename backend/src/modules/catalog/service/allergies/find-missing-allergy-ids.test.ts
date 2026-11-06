import { describe, expect, it } from "vitest";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.findMissingAllergyIds (unit)", () => {
    it("asks the repository once per distinct id", async () => {
        const { repository, service } = setupCatalogService();
        repository.findMissingAllergyIds.mockResolvedValue(["b"]);

        expect(await service.findMissingAllergyIds(["a", "b", "a"])).toEqual(["b"]);
        expect(repository.findMissingAllergyIds).toHaveBeenCalledWith(["a", "b"]);
    });

    it("skips the repository for no ids", async () => {
        const { repository, service } = setupCatalogService();

        expect(await service.findMissingAllergyIds([])).toEqual([]);
        expect(repository.findMissingAllergyIds).not.toHaveBeenCalled();
    });
});

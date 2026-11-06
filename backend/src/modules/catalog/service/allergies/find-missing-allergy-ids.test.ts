import { describe, expect, it } from "vitest";
import { createMockCatalogRepository } from "../../test-utils/mocks/catalog.mocks.js";
import { CatalogService } from "../catalog.service.js";

describe("CatalogService.findMissingAllergyIds (unit)", () => {
    it("asks the repository once per distinct id", async () => {
        const repository = createMockCatalogRepository();
        repository.findMissingAllergyIds.mockResolvedValue(["b"]);

        expect(await new CatalogService(repository).findMissingAllergyIds(["a", "b", "a"])).toEqual(["b"]);
        expect(repository.findMissingAllergyIds).toHaveBeenCalledWith(["a", "b"]);
    });

    it("skips the repository for no ids", async () => {
        const repository = createMockCatalogRepository();

        expect(await new CatalogService(repository).findMissingAllergyIds([])).toEqual([]);
        expect(repository.findMissingAllergyIds).not.toHaveBeenCalled();
    });
});

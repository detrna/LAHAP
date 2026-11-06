import { describe, expect, it } from "vitest";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.findMissingPackageIds (unit)", () => {
    it("asks the repository once per distinct id", async () => {
        const { repository, service } = setupCatalogService();
        repository.findMissingPackageIds.mockResolvedValue(["b"]);

        expect(await service.findMissingPackageIds(["a", "b", "a"])).toEqual(["b"]);
        expect(repository.findMissingPackageIds).toHaveBeenCalledWith(["a", "b"]);
    });

    it("skips the repository for no ids", async () => {
        const { repository, service } = setupCatalogService();

        expect(await service.findMissingPackageIds([])).toEqual([]);
        expect(repository.findMissingPackageIds).not.toHaveBeenCalled();
    });
});

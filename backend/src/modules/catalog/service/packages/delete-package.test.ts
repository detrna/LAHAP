import { describe, expect, it } from "vitest";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { PackageInUseError, PackageNotFoundError } from "../interfaces/catalog.repository.js";

describe("CatalogService.deletePackage (unit)", () => {
    it("deletes the package", async () => {
        const { repository, service } = setupCatalogService();

        await service.deletePackage("p-1");

        expect(repository.deletePackage).toHaveBeenCalledWith("p-1");
    });

    it("throws PackageNotFoundError when nothing was deleted", async () => {
        const { repository, service } = setupCatalogService();
        repository.deletePackage.mockResolvedValue(false);

        await expect(service.deletePackage("missing")).rejects.toBeInstanceOf(PackageNotFoundError);
    });

    it("lets the repository's in-use conflict through", async () => {
        const { repository, service } = setupCatalogService();
        repository.deletePackage.mockRejectedValue(new PackageInUseError("p-1"));

        await expect(service.deletePackage("p-1")).rejects.toBeInstanceOf(PackageInUseError);
    });
});

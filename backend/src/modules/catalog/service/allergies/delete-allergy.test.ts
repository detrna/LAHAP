import { describe, expect, it } from "vitest";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { AllergyNotFoundError } from "../interfaces/catalog.repository.js";

describe("CatalogService.deleteAllergy (unit)", () => {
    it("deletes the allergy", async () => {
        const { repository, service } = setupCatalogService();

        await service.deleteAllergy("a-1");

        expect(repository.deleteAllergy).toHaveBeenCalledWith("a-1");
    });

    it("throws AllergyNotFoundError when nothing was deleted", async () => {
        const { repository, service } = setupCatalogService();
        repository.deleteAllergy.mockResolvedValue(false);

        await expect(service.deleteAllergy("missing")).rejects.toBeInstanceOf(AllergyNotFoundError);
    });
});

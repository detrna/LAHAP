import { describe, expect, it } from "vitest";
import { AllergyNotFoundError } from "../interfaces/catalog.repository.js";
import { buildAllergyRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.getAllergy (unit)", () => {
    it("returns the mapped allergy", async () => {
        const { repository, service } = setupCatalogService();
        repository.findAllergyById.mockResolvedValue(buildAllergyRecord({ name: "Telur" }));

        expect(await service.getAllergy("a-1")).toMatchObject({ name: "Telur" });
        expect(repository.findAllergyById).toHaveBeenCalledWith("a-1");
    });

    it("throws AllergyNotFoundError when missing", async () => {
        const { service } = setupCatalogService();

        await expect(service.getAllergy("missing")).rejects.toBeInstanceOf(AllergyNotFoundError);
    });
});

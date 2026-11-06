import { describe, expect, it } from "vitest";
import { buildAllergyRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { AllergyAlreadyExistsError } from "../interfaces/catalog.repository.js";

describe("CatalogService.createAllergy (unit)", () => {
    it("creates the allergy by name and returns it mapped", async () => {
        const { repository, service } = setupCatalogService();
        repository.createAllergy.mockResolvedValue(buildAllergyRecord({ name: "Gluten" }));

        expect(await service.createAllergy({ name: "Gluten" })).toMatchObject({ name: "Gluten" });
        expect(repository.createAllergy).toHaveBeenCalledWith("Gluten");
    });

    it("lets a duplicate name through as the repository's conflict", async () => {
        const { repository, service } = setupCatalogService();
        repository.createAllergy.mockRejectedValue(new AllergyAlreadyExistsError("Gluten"));

        await expect(service.createAllergy({ name: "Gluten" })).rejects.toBeInstanceOf(AllergyAlreadyExistsError);
    });
});

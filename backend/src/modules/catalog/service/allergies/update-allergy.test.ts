import { describe, expect, it } from "vitest";
import { buildAllergyRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { AllergyAlreadyExistsError, AllergyNotFoundError } from "../interfaces/catalog.repository.js";

describe("CatalogService.updateAllergy (unit)", () => {
    it("renames the allergy and returns it mapped", async () => {
        const { repository, service } = setupCatalogService();
        repository.updateAllergy.mockResolvedValue(buildAllergyRecord({ id: "a-1", name: "Kerang" }));

        expect(await service.updateAllergy("a-1", { name: "Kerang" })).toMatchObject({ id: "a-1", name: "Kerang" });
        expect(repository.updateAllergy).toHaveBeenCalledWith("a-1", "Kerang");
    });

    it("throws AllergyNotFoundError when missing", async () => {
        const { service } = setupCatalogService();

        await expect(service.updateAllergy("missing", { name: "Kerang" })).rejects.toBeInstanceOf(AllergyNotFoundError);
    });

    it("lets a duplicate name through as the repository's conflict", async () => {
        const { repository, service } = setupCatalogService();
        repository.updateAllergy.mockRejectedValue(new AllergyAlreadyExistsError("Kerang"));

        await expect(service.updateAllergy("a-1", { name: "Kerang" })).rejects.toBeInstanceOf(
            AllergyAlreadyExistsError,
        );
    });
});

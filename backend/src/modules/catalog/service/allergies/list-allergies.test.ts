import { describe, expect, it } from "vitest";
import { buildAllergyRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.listAllergies (unit)", () => {
    it("maps every allergy with Jakarta timestamps", async () => {
        const { repository, service } = setupCatalogService();
        repository.findAllAllergies.mockResolvedValue([buildAllergyRecord({ name: "Kacang" })]);

        expect(await service.listAllergies()).toEqual([
            {
                id: "00000000-0000-4000-8000-000000000001",
                name: "Kacang",
                createdAt: "2026-11-03T08:00:00.000+07:00",
                updatedAt: "2026-11-03T08:00:00.000+07:00",
            },
        ]);
    });
});

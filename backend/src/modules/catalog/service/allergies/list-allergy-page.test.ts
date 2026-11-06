import { describe, expect, it } from "vitest";
import { buildAllergyRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.listAllergyPage (unit)", () => {
    it("passes the search and page window and maps the items", async () => {
        const { repository, service } = setupCatalogService();
        repository.listAllergies.mockResolvedValue({ items: [buildAllergyRecord({ name: "Susu" })], total: 7 });

        const page = await service.listAllergyPage({ search: "su", skip: 20, take: 10 });

        expect(repository.listAllergies).toHaveBeenCalledWith({ search: "su", skip: 20, take: 10 });
        expect(page.total).toBe(7);
        expect(page.items.map(item => item.name)).toEqual(["Susu"]);
    });
});

import { describe, expect, it } from "vitest";
import { buildMenuRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.listMenus (unit)", () => {
    it("passes the filters on and presents the page with recipe lines", async () => {
        const { repository, service } = setupCatalogService();
        repository.listMenus.mockResolvedValue({ items: [buildMenuRecord({ id: "m-1" })], total: 7 });

        const page = await service.listMenus({ search: "ayam", isAlternative: true, skip: 10, take: 10 });

        expect(repository.listMenus).toHaveBeenCalledWith({ search: "ayam", isAlternative: true, skip: 10, take: 10 });
        expect(page.total).toBe(7);
        expect(page.items[0]).toMatchObject({ id: "m-1", ingredients: expect.any(Array) });
    });
});

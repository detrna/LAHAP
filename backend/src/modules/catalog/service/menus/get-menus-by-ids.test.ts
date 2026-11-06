import { describe, expect, it } from "vitest";
import { buildMenuRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.getMenusByIds (unit)", () => {
    it("reads each id once", async () => {
        const { repository, service } = setupCatalogService();
        repository.findMenusByIds.mockResolvedValue([buildMenuRecord({ id: "m-1" })]);

        const menus = await service.getMenusByIds(["m-1", "m-1"]);

        expect(repository.findMenusByIds).toHaveBeenCalledWith(["m-1"]);
        expect(menus.map(menu => menu.id)).toEqual(["m-1"]);
    });

    it("skips the repository for no ids", async () => {
        const { repository, service } = setupCatalogService();

        expect(await service.getMenusByIds([])).toEqual([]);
        expect(repository.findMenusByIds).not.toHaveBeenCalled();
    });
});

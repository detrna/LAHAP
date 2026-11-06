import { describe, expect, it } from "vitest";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { MenuNotFoundError } from "../interfaces/catalog.repository.js";

describe("CatalogService.deleteMenu (unit)", () => {
    it("deletes the menu", async () => {
        const { repository, service } = setupCatalogService();

        await service.deleteMenu("m-1");

        expect(repository.deleteMenu).toHaveBeenCalledWith("m-1");
    });

    it("throws MenuNotFoundError when nothing was deleted", async () => {
        const { repository, service } = setupCatalogService();
        repository.deleteMenu.mockResolvedValue(false);

        await expect(service.deleteMenu("missing")).rejects.toBeInstanceOf(MenuNotFoundError);
    });
});

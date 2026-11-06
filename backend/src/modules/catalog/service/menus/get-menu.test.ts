import { describe, expect, it } from "vitest";
import { buildMenuRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { MenuNotFoundError } from "../interfaces/catalog.repository.js";

describe("CatalogService.getMenu (unit)", () => {
    it("returns the menu with its recipe lines", async () => {
        const { repository, service } = setupCatalogService();
        repository.findMenuById.mockResolvedValue(buildMenuRecord({ id: "m-1" }));

        expect(await service.getMenu("m-1")).toMatchObject({ id: "m-1", ingredients: expect.any(Array) });
    });

    it("throws MenuNotFoundError when missing", async () => {
        const { service } = setupCatalogService();

        await expect(service.getMenu("missing")).rejects.toBeInstanceOf(MenuNotFoundError);
    });
});

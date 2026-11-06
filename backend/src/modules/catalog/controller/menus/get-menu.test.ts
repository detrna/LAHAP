import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildMenu } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.getMenu (unit)", () => {
    it("answers the menu", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildMenu();
        catalogService.getMenu.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.getMenu(createMockRequest({ params: { id: "m-1" } }), res);

        expect(catalogService.getMenu).toHaveBeenCalledWith("m-1");
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildMenu } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.updateMenu (unit)", () => {
    it("answers the updated menu", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildMenu();
        catalogService.updateMenu.mockResolvedValue(item);
        const body = { tags: [] };
        const res = createMockResponse();

        await controller.updateMenu(createMockRequest({ params: { id: "m-1" }, body }), res);

        expect(catalogService.updateMenu).toHaveBeenCalledWith("m-1", body);
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildMenu } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.createMenu (unit)", () => {
    it("answers 201 with the new menu", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildMenu();
        catalogService.createMenu.mockResolvedValue(item);
        const body = { name: "Ayam Bakar" };
        const res = createMockResponse();

        await controller.createMenu(createMockRequest({ body }), res);

        expect(catalogService.createMenu).toHaveBeenCalledWith(body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

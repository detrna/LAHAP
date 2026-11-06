import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildPackage } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";

describe("CatalogController.getAvailablePackage (unit)", () => {
    it("answers the package of the path id", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildPackage();
        catalogService.getAvailablePackage.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.getAvailablePackage(createMockRequest({ params: { id: ID } }), res);

        expect(catalogService.getAvailablePackage).toHaveBeenCalledWith(ID);
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

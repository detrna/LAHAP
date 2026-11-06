import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildPackage } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";

describe("CatalogController.updatePackage (unit)", () => {
    it("passes the id and body", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildPackage();
        catalogService.updatePackage.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.updatePackage(createMockRequest({ params: { id: ID }, body: { isActive: false } }), res);

        expect(catalogService.updatePackage).toHaveBeenCalledWith(ID, { isActive: false });
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

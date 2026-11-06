import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildAllergy } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";

describe("CatalogController.getAllergy (unit)", () => {
    it("answers the allergy of the path id", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildAllergy();
        catalogService.getAllergy.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.getAllergy(createMockRequest({ params: { id: ID } }), res);

        expect(catalogService.getAllergy).toHaveBeenCalledWith(ID);
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

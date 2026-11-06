import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildPackage } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.createPackage (unit)", () => {
    it("answers 201 with the new package", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildPackage();
        catalogService.createPackage.mockResolvedValue(item);
        const body = { name: "Diet Sehat" };
        const res = createMockResponse();

        await controller.createPackage(createMockRequest({ body }), res);

        expect(catalogService.createPackage).toHaveBeenCalledWith(body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

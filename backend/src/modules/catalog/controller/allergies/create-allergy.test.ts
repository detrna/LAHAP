import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildAllergy } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.createAllergy (unit)", () => {
    it("answers 201 with the new allergy", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildAllergy({ name: "Gluten" });
        catalogService.createAllergy.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.createAllergy(createMockRequest({ body: { name: "Gluten" } }), res);

        expect(catalogService.createAllergy).toHaveBeenCalledWith({ name: "Gluten" });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildAllergy } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.listAllergies (unit)", () => {
    it("answers the whole list", async () => {
        const { catalogService, controller } = setupCatalogController();
        const items = [buildAllergy()];
        catalogService.listAllergies.mockResolvedValue(items);
        const res = createMockResponse();

        await controller.listAllergies(createMockRequest(), res);

        expect(res.json).toHaveBeenCalledWith({ data: items });
    });
});

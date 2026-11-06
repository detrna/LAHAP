import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildAllergy } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";

describe("CatalogController.updateAllergy (unit)", () => {
    it("passes the id and body", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildAllergy({ name: "Kerang" });
        catalogService.updateAllergy.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.updateAllergy(createMockRequest({ params: { id: ID }, body: { name: "Kerang" } }), res);

        expect(catalogService.updateAllergy).toHaveBeenCalledWith(ID, { name: "Kerang" });
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

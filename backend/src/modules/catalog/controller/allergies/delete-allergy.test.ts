import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";

describe("CatalogController.deleteAllergy (unit)", () => {
    it("answers 204 without a body", async () => {
        const { catalogService, controller } = setupCatalogController();
        catalogService.deleteAllergy.mockResolvedValue(undefined);
        const res = createMockResponse();

        await controller.deleteAllergy(createMockRequest({ params: { id: ID } }), res);

        expect(catalogService.deleteAllergy).toHaveBeenCalledWith(ID);
        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.end).toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });
});

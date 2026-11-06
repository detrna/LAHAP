import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.publishSchedules (unit)", () => {
    it("answers the updated count", async () => {
        const { catalogService, controller } = setupCatalogController();
        catalogService.publishSchedules.mockResolvedValue({ updatedCount: 3 });
        const body = { ids: ["s-1"], publish: true };
        const res = createMockResponse();

        await controller.publishSchedules(createMockRequest({ body }), res);

        expect(catalogService.publishSchedules).toHaveBeenCalledWith(body);
        expect(res.json).toHaveBeenCalledWith({ data: { updatedCount: 3 } });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.deleteSchedules (unit)", () => {
    it("answers the deleted count", async () => {
        const { catalogService, controller } = setupCatalogController();
        catalogService.deleteSchedules.mockResolvedValue({ deletedCount: 2 });
        const res = createMockResponse();

        await controller.deleteSchedules(createMockRequest({ body: { ids: ["s-1", "s-2"] } }), res);

        expect(catalogService.deleteSchedules).toHaveBeenCalledWith(["s-1", "s-2"]);
        expect(res.json).toHaveBeenCalledWith({ data: { deletedCount: 2 } });
    });
});

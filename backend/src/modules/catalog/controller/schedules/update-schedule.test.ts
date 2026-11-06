import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildMenuSchedule } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.updateSchedule (unit)", () => {
    it("answers the updated schedule", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildMenuSchedule();
        catalogService.updateSchedule.mockResolvedValue(item);
        const body = { isPublished: true };
        const res = createMockResponse();

        await controller.updateSchedule(createMockRequest({ params: { id: "s-1" }, body }), res);

        expect(catalogService.updateSchedule).toHaveBeenCalledWith("s-1", body);
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

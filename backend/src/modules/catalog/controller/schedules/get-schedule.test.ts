import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildMenuSchedule } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.getSchedule (unit)", () => {
    it("answers the schedule", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildMenuSchedule();
        catalogService.getSchedule.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.getSchedule(createMockRequest({ params: { id: "s-1" } }), res);

        expect(catalogService.getSchedule).toHaveBeenCalledWith("s-1");
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

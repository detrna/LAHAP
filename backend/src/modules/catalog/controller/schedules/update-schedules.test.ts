import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildMenuSchedule } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.updateSchedules (unit)", () => {
    it("answers the updated schedules", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildMenuSchedule();
        catalogService.updateSchedules.mockResolvedValue([item]);
        const items = [{ id: "s-1", isPublished: true }];
        const res = createMockResponse();

        await controller.updateSchedules(createMockRequest({ body: { items } }), res);

        expect(catalogService.updateSchedules).toHaveBeenCalledWith(items);
        expect(res.json).toHaveBeenCalledWith({ data: [item] });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildMenuSchedule } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.createSchedules (unit)", () => {
    it("answers 201 with the new schedules", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildMenuSchedule();
        catalogService.createSchedules.mockResolvedValue([item]);
        const items = [{ packageId: "p-1" }];
        const res = createMockResponse();

        await controller.createSchedules(createMockRequest({ body: { items } }), res);

        expect(catalogService.createSchedules).toHaveBeenCalledWith(items);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: [item] });
    });
});

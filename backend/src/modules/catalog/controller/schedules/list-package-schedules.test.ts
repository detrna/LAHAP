import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildMenuSchedule } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.listPackageSchedules (unit)", () => {
    it("answers the package's published schedules for the range", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildMenuSchedule({ isPublished: true });
        catalogService.listPublishedSchedules.mockResolvedValue([item]);
        const from = Temporal.PlainDate.from("2026-11-10");
        const res = createMockResponse();

        await controller.listPackageSchedules(createMockRequest({ params: { id: "p-1" }, query: { from } }), res);

        expect(catalogService.listPublishedSchedules).toHaveBeenCalledWith("p-1", { from, to: undefined });
        expect(res.json).toHaveBeenCalledWith({ data: [item] });
    });
});

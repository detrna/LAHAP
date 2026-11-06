import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildMenuSchedule } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.listSchedules (unit)", () => {
    it("passes the filters and page and answers a paginated list", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildMenuSchedule();
        catalogService.listSchedules.mockResolvedValue({ items: [item], total: 1 });
        const from = Temporal.PlainDate.from("2026-11-01");
        const req = createMockRequest({ query: { packageId: "p-1", from, isPublished: false } });
        Object.assign(req, { pagination: { page: 1, limit: 20, offset: 0, skip: 0, take: 20 } });
        const res = createMockResponse();

        await controller.listSchedules(req, res);

        expect(catalogService.listSchedules).toHaveBeenCalledWith({
            packageId: "p-1",
            from,
            to: undefined,
            isPublished: false,
            skip: 0,
            take: 20,
        });
        expect(res.json).toHaveBeenCalledWith({ data: [item], meta: expect.objectContaining({ total: 1 }) });
    });
});

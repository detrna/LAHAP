import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildMenu } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.listMenus (unit)", () => {
    it("passes the filters and page and answers a paginated list", async () => {
        const { catalogService, controller } = setupCatalogController();
        const item = buildMenu();
        catalogService.listMenus.mockResolvedValue({ items: [item], total: 1 });
        const req = createMockRequest({ query: { search: "ayam", isAlternative: true } });
        Object.assign(req, { pagination: { page: 2, limit: 10, offset: 10, skip: 10, take: 10 } });
        const res = createMockResponse();

        await controller.listMenus(req, res);

        expect(catalogService.listMenus).toHaveBeenCalledWith({
            search: "ayam",
            isAlternative: true,
            skip: 10,
            take: 10,
        });
        expect(res.json).toHaveBeenCalledWith({
            data: [item],
            meta: expect.objectContaining({ page: 2, limit: 10, total: 1 }),
        });
    });
});

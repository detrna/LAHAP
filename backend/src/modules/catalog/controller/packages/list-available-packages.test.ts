import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildPackage } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

const PAGINATION = { page: 2, limit: 10, offset: 10, skip: 10, take: 10 };

describe("CatalogController.listAvailablePackages (unit)", () => {
    it("passes the search and pagination, and answers a page", async () => {
        const { catalogService, controller } = setupCatalogController();
        const items = [buildPackage()];
        catalogService.listAvailablePackages.mockResolvedValue({ items, total: 21 });
        const res = createMockResponse();

        await controller.listAvailablePackages(
            createMockRequest({ query: { search: "diet", page: 2, limit: 10 }, pagination: PAGINATION }),
            res,
        );

        expect(catalogService.listAvailablePackages).toHaveBeenCalledWith({ search: "diet", skip: 10, take: 10 });
        expect(res.json).toHaveBeenCalledWith({
            data: items,
            meta: expect.objectContaining({ page: 2, limit: 10, total: 21, totalPages: 3 }),
        });
    });
});

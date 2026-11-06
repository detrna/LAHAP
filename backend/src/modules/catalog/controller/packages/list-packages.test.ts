import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildPackage } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

const PAGINATION = { page: 2, limit: 10, offset: 10, skip: 10, take: 10 };

describe("CatalogController.listPackages (unit)", () => {
    it("passes the filters and pagination, and answers a page", async () => {
        const { catalogService, controller } = setupCatalogController();
        const items = [buildPackage()];
        catalogService.listPackages.mockResolvedValue({ items, total: 1 });
        const res = createMockResponse();

        await controller.listPackages(
            createMockRequest({
                query: { search: "diet", isActive: false, page: 2, limit: 10 },
                pagination: PAGINATION,
            }),
            res,
        );

        expect(catalogService.listPackages).toHaveBeenCalledWith({
            search: "diet",
            isActive: false,
            skip: 10,
            take: 10,
        });
        expect(res.json).toHaveBeenCalledWith({ data: items, meta: expect.objectContaining({ total: 1 }) });
    });
});

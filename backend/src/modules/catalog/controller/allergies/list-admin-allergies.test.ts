import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { buildAllergy } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.listAdminAllergies (unit)", () => {
    it("passes the search and pagination, and answers a page", async () => {
        const { catalogService, controller } = setupCatalogController();
        const items = [buildAllergy()];
        catalogService.listAllergyPage.mockResolvedValue({ items, total: 21 });
        const res = createMockResponse();

        await controller.listAdminAllergies(
            createMockRequest({
                query: { search: "ka", page: 2, limit: 10 },
                pagination: { page: 2, limit: 10, offset: 10, skip: 10, take: 10 },
            }),
            res,
        );

        expect(catalogService.listAllergyPage).toHaveBeenCalledWith({ search: "ka", skip: 10, take: 10 });
        expect(res.json).toHaveBeenCalledWith({
            data: items,
            meta: expect.objectContaining({ page: 2, limit: 10, total: 21, totalPages: 3 }),
        });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { setupCatalogController } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogController.deleteMenu (unit)", () => {
    it("answers 204", async () => {
        const { catalogService, controller } = setupCatalogController();
        const res = createMockResponse();

        await controller.deleteMenu(createMockRequest({ params: { id: "m-1" } }), res);

        expect(catalogService.deleteMenu).toHaveBeenCalledWith("m-1");
        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.end).toHaveBeenCalled();
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildTier } from "../test-utils/factory/tiers.factory.js";
import { setupTiersController } from "../test-utils/setup/tiers.setup.js";

describe("TiersController.listTiers (unit)", () => {
    it("passes the pagination and answers a page", async () => {
        const { tiersService, controller } = setupTiersController();
        const items = [buildTier()];
        tiersService.listTiers.mockResolvedValue({ items, total: 1 });
        const res = createMockResponse();

        await controller.listTiers(
            createMockRequest({ pagination: { page: 2, limit: 10, offset: 10, skip: 10, take: 10 } }),
            res,
        );

        expect(tiersService.listTiers).toHaveBeenCalledWith({ skip: 10, take: 10 });
        expect(res.json).toHaveBeenCalledWith({ data: items, meta: expect.objectContaining({ total: 1 }) });
    });
});

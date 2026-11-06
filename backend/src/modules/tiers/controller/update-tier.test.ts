import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildTier } from "../test-utils/factory/tiers.factory.js";
import { setupTiersController } from "../test-utils/setup/tiers.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";

describe("TiersController.updateTier (unit)", () => {
    it("passes the id and body", async () => {
        const { tiersService, controller } = setupTiersController();
        const item = buildTier({ discountPercent: 12 });
        tiersService.updateTier.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.updateTier(createMockRequest({ params: { id: ID }, body: { discountPercent: 12 } }), res);

        expect(tiersService.updateTier).toHaveBeenCalledWith(ID, { discountPercent: 12 });
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

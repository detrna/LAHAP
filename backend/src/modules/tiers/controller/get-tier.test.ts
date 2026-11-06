import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildTier } from "../test-utils/factory/tiers.factory.js";
import { setupTiersController } from "../test-utils/setup/tiers.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";

describe("TiersController.getTier (unit)", () => {
    it("passes the id and answers the tier", async () => {
        const { tiersService, controller } = setupTiersController();
        const item = buildTier();
        tiersService.getTier.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.getTier(createMockRequest({ params: { id: ID } }), res);

        expect(tiersService.getTier).toHaveBeenCalledWith(ID);
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildTier } from "../test-utils/factory/tiers.factory.js";
import { setupTiersController } from "../test-utils/setup/tiers.setup.js";

describe("TiersController.listPublicTiers (unit)", () => {
    it("answers every tier in the success envelope without pagination", async () => {
        const { tiersService, controller } = setupTiersController();
        const items = [buildTier({ id: "biasa" }), buildTier({ id: "gold" })];
        tiersService.listPublicTiers.mockResolvedValue(items);
        const res = createMockResponse();

        await controller.listPublicTiers(createMockRequest(), res);

        expect(tiersService.listPublicTiers).toHaveBeenCalledWith();
        expect(res.json).toHaveBeenCalledWith({ data: items });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildTier } from "../test-utils/factory/tiers.factory.js";
import { setupTiersController } from "../test-utils/setup/tiers.setup.js";

describe("TiersController.createTier (unit)", () => {
    it("passes the body and answers 201 with the tier", async () => {
        const { tiersService, controller } = setupTiersController();
        const item = buildTier({ name: "Platinum" });
        tiersService.createTier.mockResolvedValue(item);
        const res = createMockResponse();
        const body = { name: "Platinum", requiredSubscriptionDays: 90, discountPercent: 15 };

        await controller.createTier(createMockRequest({ body }), res);

        expect(tiersService.createTier).toHaveBeenCalledWith(body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

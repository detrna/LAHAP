import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildMembershipOverview } from "../test-utils/factory/tiers.factory.js";
import { setupTiersController } from "../test-utils/setup/tiers.setup.js";

describe("TiersController.getMyMembership (unit)", () => {
    it("answers the overview of the signed-in user", async () => {
        const { tiersService, controller } = setupTiersController();
        const overview = buildMembershipOverview({ subscriptionDays: 12 });
        tiersService.getMembershipOverview.mockResolvedValue(overview);
        const res = createMockResponse();

        await controller.getMyMembership(
            createMockRequest({ user: { userId: "user-1", name: "Ayu", role: "CUSTOMER" } }),
            res,
        );

        expect(tiersService.getMembershipOverview).toHaveBeenCalledWith("user-1");
        expect(res.json).toHaveBeenCalledWith({ data: overview });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildChurnFollowUp } from "../test-utils/factory/retention.factory.js";
import { setupRetentionController } from "../test-utils/setup/retention.setup.js";

describe("RetentionController.buildFollowUp (unit)", () => {
    it("passes the user and the body and answers the follow-up", async () => {
        const { retentionService, controller } = setupRetentionController();
        const followUp = buildChurnFollowUp();
        retentionService.buildFollowUp.mockResolvedValue(followUp);
        const res = createMockResponse();
        const body = { templateId: "t1", promoCode: "MERDEKA" };

        await controller.buildFollowUp(createMockRequest({ params: { userId: "u1" }, body }), res);

        expect(retentionService.buildFollowUp).toHaveBeenCalledWith("u1", body);
        expect(res.json).toHaveBeenCalledWith({ data: followUp });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildMessageTemplate } from "../test-utils/factory/retention.factory.js";
import { setupRetentionController } from "../test-utils/setup/retention.setup.js";

describe("RetentionController.getMessageTemplate (unit)", () => {
    it("answers the template by id", async () => {
        const { retentionService, controller } = setupRetentionController();
        const template = buildMessageTemplate();
        retentionService.getMessageTemplate.mockResolvedValue(template);
        const res = createMockResponse();

        await controller.getMessageTemplate(createMockRequest({ params: { id: "t1" } }), res);

        expect(retentionService.getMessageTemplate).toHaveBeenCalledWith("t1");
        expect(res.json).toHaveBeenCalledWith({ data: template });
    });
});

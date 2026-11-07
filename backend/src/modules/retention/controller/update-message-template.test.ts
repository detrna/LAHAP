import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildMessageTemplate } from "../test-utils/factory/retention.factory.js";
import { setupRetentionController } from "../test-utils/setup/retention.setup.js";

describe("RetentionController.updateMessageTemplate (unit)", () => {
    it("passes the id and the changes and answers the template", async () => {
        const { retentionService, controller } = setupRetentionController();
        const template = buildMessageTemplate();
        retentionService.updateMessageTemplate.mockResolvedValue(template);
        const res = createMockResponse();

        await controller.updateMessageTemplate(createMockRequest({ params: { id: "t1" }, body: { name: "New" } }), res);

        expect(retentionService.updateMessageTemplate).toHaveBeenCalledWith("t1", { name: "New" });
        expect(res.json).toHaveBeenCalledWith({ data: template });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildMessageTemplate } from "../test-utils/factory/retention.factory.js";
import { setupRetentionController } from "../test-utils/setup/retention.setup.js";

describe("RetentionController.createMessageTemplate (unit)", () => {
    it("passes the body and answers 201 with the template", async () => {
        const { retentionService, controller } = setupRetentionController();
        const template = buildMessageTemplate();
        retentionService.createMessageTemplate.mockResolvedValue(template);
        const res = createMockResponse();
        const body = { name: "Win-back", body: "Halo {nama}" };

        await controller.createMessageTemplate(createMockRequest({ body }), res);

        expect(retentionService.createMessageTemplate).toHaveBeenCalledWith(body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: template });
    });
});

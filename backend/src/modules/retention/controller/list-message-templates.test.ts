import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildMessageTemplate } from "../test-utils/factory/retention.factory.js";
import { setupRetentionController } from "../test-utils/setup/retention.setup.js";

describe("RetentionController.listMessageTemplates (unit)", () => {
    it("passes the pagination and answers a page", async () => {
        const { retentionService, controller } = setupRetentionController();
        const items = [buildMessageTemplate()];
        retentionService.listMessageTemplates.mockResolvedValue({ items, total: 11 });
        const res = createMockResponse();

        await controller.listMessageTemplates(
            createMockRequest({ pagination: { page: 2, limit: 10, offset: 10, skip: 10, take: 10 } }),
            res,
        );

        expect(retentionService.listMessageTemplates).toHaveBeenCalledWith({ skip: 10, take: 10 });
        expect(res.json).toHaveBeenCalledWith({
            data: items,
            meta: expect.objectContaining({ page: 2, limit: 10, total: 11 }),
        });
    });
});

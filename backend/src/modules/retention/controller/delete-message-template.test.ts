import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupRetentionController } from "../test-utils/setup/retention.setup.js";

describe("RetentionController.deleteMessageTemplate (unit)", () => {
    it("deletes by id and answers 204 with no body", async () => {
        const { retentionService, controller } = setupRetentionController();
        retentionService.deleteMessageTemplate.mockResolvedValue(undefined);
        const res = createMockResponse();

        await controller.deleteMessageTemplate(createMockRequest({ params: { id: "t1" } }), res);

        expect(retentionService.deleteMessageTemplate).toHaveBeenCalledWith("t1");
        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.end).toHaveBeenCalled();
    });
});

import { describe, expect, it } from "vitest";
import { buildMessageTemplateRecord } from "../test-utils/factory/retention.factory.js";
import { setupRetentionService } from "../test-utils/setup/retention.setup.js";
import { MessageTemplateNotFoundError } from "./interfaces/retention.repository.js";

describe("RetentionService.getMessageTemplate (unit)", () => {
    it("answers the template", async () => {
        const { repository, service } = setupRetentionService();
        repository.findMessageTemplateById.mockResolvedValue(buildMessageTemplateRecord({ id: "t1" }));

        expect(await service.getMessageTemplate("t1")).toMatchObject({ id: "t1", name: "test name" });
        expect(repository.findMessageTemplateById).toHaveBeenCalledWith("t1");
    });

    it("throws MessageTemplateNotFoundError for an unknown id", async () => {
        const { service } = setupRetentionService();

        await expect(service.getMessageTemplate("missing")).rejects.toBeInstanceOf(MessageTemplateNotFoundError);
    });
});

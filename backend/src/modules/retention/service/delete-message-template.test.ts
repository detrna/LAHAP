import { describe, expect, it } from "vitest";
import { setupRetentionService } from "../test-utils/setup/retention.setup.js";
import { MessageTemplateNotFoundError } from "./interfaces/retention.repository.js";

describe("RetentionService.deleteMessageTemplate (unit)", () => {
    it("deletes the template", async () => {
        const { repository, service } = setupRetentionService();
        repository.deleteMessageTemplate.mockResolvedValue(true);

        await service.deleteMessageTemplate("t1");

        expect(repository.deleteMessageTemplate).toHaveBeenCalledWith("t1");
    });

    it("throws MessageTemplateNotFoundError when nothing was deleted", async () => {
        const { service } = setupRetentionService();

        await expect(service.deleteMessageTemplate("missing")).rejects.toBeInstanceOf(MessageTemplateNotFoundError);
    });
});

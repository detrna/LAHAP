import { describe, expect, it } from "vitest";
import { buildMessageTemplateRecord } from "../test-utils/factory/retention.factory.js";
import { setupRetentionService } from "../test-utils/setup/retention.setup.js";
import { MessageTemplateAlreadyExistsError, MessageTemplateNotFoundError } from "./interfaces/retention.repository.js";

function setup() {
    const context = setupRetentionService();
    const existing = buildMessageTemplateRecord({ id: "t1", name: "Old", body: "Halo" });
    context.repository.findMessageTemplateById.mockResolvedValue(existing);
    context.repository.updateMessageTemplate.mockImplementation(async (id, changes) =>
        buildMessageTemplateRecord({ ...existing, id, ...changes }),
    );
    return context;
}

describe("RetentionService.updateMessageTemplate (unit)", () => {
    it("checks a new name against the other templates and saves the changes", async () => {
        const { repository, service } = setup();

        const template = await service.updateMessageTemplate("t1", { name: "New" });

        expect(repository.isMessageTemplateNameTaken).toHaveBeenCalledWith("New", "t1");
        expect(repository.updateMessageTemplate).toHaveBeenCalledWith("t1", { name: "New" });
        expect(template).toMatchObject({ id: "t1", name: "New", body: "Halo" });
    });

    it("does not check the name when only the body changes", async () => {
        const { repository, service } = setup();

        await service.updateMessageTemplate("t1", { body: "Halo {nama}" });

        expect(repository.isMessageTemplateNameTaken).not.toHaveBeenCalled();
        expect(repository.updateMessageTemplate).toHaveBeenCalledWith("t1", { body: "Halo {nama}" });
    });

    it("refuses a name another template uses, without writing", async () => {
        const { repository, service } = setup();
        repository.isMessageTemplateNameTaken.mockResolvedValue(true);

        await expect(service.updateMessageTemplate("t1", { name: "Taken" })).rejects.toBeInstanceOf(
            MessageTemplateAlreadyExistsError,
        );
        expect(repository.updateMessageTemplate).not.toHaveBeenCalled();
    });

    it("throws MessageTemplateNotFoundError for an unknown id", async () => {
        const { repository, service } = setup();
        repository.findMessageTemplateById.mockResolvedValue(null);

        await expect(service.updateMessageTemplate("missing", { body: "x" })).rejects.toBeInstanceOf(
            MessageTemplateNotFoundError,
        );
        expect(repository.updateMessageTemplate).not.toHaveBeenCalled();
    });

    it("throws MessageTemplateNotFoundError when the template is deleted before the write", async () => {
        const { repository, service } = setup();
        repository.updateMessageTemplate.mockResolvedValue(null);

        await expect(service.updateMessageTemplate("t1", { body: "x" })).rejects.toBeInstanceOf(
            MessageTemplateNotFoundError,
        );
    });
});

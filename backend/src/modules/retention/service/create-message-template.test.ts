import { describe, expect, it } from "vitest";
import { buildMessageTemplateRecord } from "../test-utils/factory/retention.factory.js";
import { setupRetentionService } from "../test-utils/setup/retention.setup.js";
import { MessageTemplateAlreadyExistsError } from "./interfaces/retention.repository.js";

describe("RetentionService.createMessageTemplate (unit)", () => {
    it("checks the name and creates the template", async () => {
        const { repository, service } = setupRetentionService();
        repository.createMessageTemplate.mockImplementation(async record =>
            buildMessageTemplateRecord({ id: "new", ...record }),
        );

        const template = await service.createMessageTemplate({ name: "Win-back", body: "Halo {nama}" });

        expect(repository.isMessageTemplateNameTaken).toHaveBeenCalledWith("Win-back");
        expect(repository.createMessageTemplate).toHaveBeenCalledWith({ name: "Win-back", body: "Halo {nama}" });
        expect(template).toMatchObject({ id: "new", name: "Win-back", body: "Halo {nama}" });
    });

    it("refuses a name that is already used, without writing", async () => {
        const { repository, service } = setupRetentionService();
        repository.isMessageTemplateNameTaken.mockResolvedValue(true);

        await expect(service.createMessageTemplate({ name: "win-back", body: "Halo" })).rejects.toBeInstanceOf(
            MessageTemplateAlreadyExistsError,
        );
        expect(repository.createMessageTemplate).not.toHaveBeenCalled();
    });
});

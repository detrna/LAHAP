import { describe, expect, it } from "vitest";
import { buildMessageTemplateRecord } from "../test-utils/factory/retention.factory.js";
import { setupRetentionService } from "../test-utils/setup/retention.setup.js";

describe("RetentionService.listMessageTemplates (unit)", () => {
    it("passes the page and answers the templates with Jakarta timestamps", async () => {
        const { repository, service } = setupRetentionService();
        const record = buildMessageTemplateRecord({ id: "t1", name: "Win-back", body: "Halo {nama}" });
        repository.listMessageTemplates.mockResolvedValue({ items: [record], total: 3 });

        const page = await service.listMessageTemplates({ skip: 2, take: 2 });

        expect(repository.listMessageTemplates).toHaveBeenCalledWith({ skip: 2, take: 2 });
        expect(page).toEqual({
            items: [
                {
                    id: "t1",
                    name: "Win-back",
                    body: "Halo {nama}",
                    createdAt: "2026-11-03T08:00:00.000+07:00",
                    updatedAt: "2026-11-03T08:00:00.000+07:00",
                },
            ],
            total: 3,
        });
    });
});

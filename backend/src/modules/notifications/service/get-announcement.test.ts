import { describe, expect, it } from "vitest";
import { AnnouncementNotFoundError } from "./interfaces/notifications.repository.js";
import { buildAnnouncementRecord } from "../test-utils/factory/notifications.factory.js";
import { setupNotificationsService } from "../test-utils/setup/notifications.setup.js";

describe("NotificationsService.getAnnouncement (unit)", () => {
    it("returns the announcement", async () => {
        const { repository, service } = setupNotificationsService();
        repository.findAnnouncementById.mockResolvedValue(buildAnnouncementRecord({ id: "a-1" }));

        expect(await service.getAnnouncement("a-1")).toMatchObject({ id: "a-1" });
    });

    it("throws not found for an unknown id", async () => {
        const { service } = setupNotificationsService();

        await expect(service.getAnnouncement("a-9")).rejects.toBeInstanceOf(AnnouncementNotFoundError);
    });
});

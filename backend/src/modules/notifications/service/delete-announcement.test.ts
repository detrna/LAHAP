import { describe, expect, it } from "vitest";
import { AnnouncementNotFoundError } from "./interfaces/notifications.repository.js";
import { setupNotificationsService } from "../test-utils/setup/notifications.setup.js";

describe("NotificationsService.deleteAnnouncement (unit)", () => {
    it("deletes an existing announcement", async () => {
        const { repository, service } = setupNotificationsService();
        repository.deleteAnnouncement.mockResolvedValue(true);

        await expect(service.deleteAnnouncement("a-1")).resolves.toBeUndefined();
        expect(repository.deleteAnnouncement).toHaveBeenCalledWith("a-1");
    });

    it("throws not found when nothing was deleted", async () => {
        const { service } = setupNotificationsService();

        await expect(service.deleteAnnouncement("a-9")).rejects.toBeInstanceOf(AnnouncementNotFoundError);
    });
});

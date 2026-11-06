import { describe, expect, it } from "vitest";
import { setupNotificationsService } from "../test-utils/setup/notifications.setup.js";

describe("NotificationsService.countUnread (unit)", () => {
    it("counts the user's unread notifications", async () => {
        const { repository, service } = setupNotificationsService();
        repository.countUnreadNotifications.mockResolvedValue(4);

        expect(await service.countUnread("admin-1")).toBe(4);
        expect(repository.countUnreadNotifications).toHaveBeenCalledWith("admin-1");
    });
});

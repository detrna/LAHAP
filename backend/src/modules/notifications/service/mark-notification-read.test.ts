import { describe, expect, it } from "vitest";
import { NotificationNotFoundError } from "./interfaces/notifications.repository.js";
import { buildNotificationRecord } from "../test-utils/factory/notifications.factory.js";
import { setupNotificationsService } from "../test-utils/setup/notifications.setup.js";

describe("NotificationsService.markNotificationRead (unit)", () => {
    it("marks the user's notification and returns it", async () => {
        const { repository, service } = setupNotificationsService();
        repository.markNotificationRead.mockResolvedValue(buildNotificationRecord({ id: "n-1", isRead: true }));

        expect(await service.markNotificationRead("u-1", "n-1")).toMatchObject({ id: "n-1", isRead: true });
        expect(repository.markNotificationRead).toHaveBeenCalledWith({ id: "n-1", userId: "u-1" });
    });

    it("answers not found for another user's or a missing notification", async () => {
        const { service } = setupNotificationsService();

        await expect(service.markNotificationRead("u-1", "n-2")).rejects.toBeInstanceOf(NotificationNotFoundError);
    });
});

import { describe, expect, it } from "vitest";
import { buildNotificationRecord } from "../test-utils/factory/notifications.factory.js";
import { setupNotificationsService } from "../test-utils/setup/notifications.setup.js";

describe("NotificationsService.listMyNotifications (unit)", () => {
    it("returns the user's page with the total and the unread count", async () => {
        const { repository, service } = setupNotificationsService();
        repository.listNotificationsForUser.mockResolvedValue({
            items: [buildNotificationRecord({ id: "n-1", title: "Pembayaran berhasil" })],
            total: 11,
        });
        repository.countUnreadNotifications.mockResolvedValue(4);

        const page = await service.listMyNotifications("u-1", { isRead: false, skip: 10, take: 10 });

        expect(page).toMatchObject({
            total: 11,
            unreadCount: 4,
            items: [{ id: "n-1", title: "Pembayaran berhasil", createdAt: "2026-11-03T07:00:00.000+07:00" }],
        });
        expect(repository.listNotificationsForUser).toHaveBeenCalledWith({
            userId: "u-1",
            isRead: false,
            skip: 10,
            take: 10,
        });
        expect(repository.countUnreadNotifications).toHaveBeenCalledWith("u-1");
    });
});

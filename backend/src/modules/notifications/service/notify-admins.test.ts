import { describe, expect, it } from "vitest";
import { buildNotificationRecord } from "../test-utils/factory/notifications.factory.js";
import { setupNotificationsService } from "../test-utils/setup/notifications.setup.js";

describe("NotificationsService.notifyAdmins (unit)", () => {
    it("saves one notification per active admin in one call and publishes each to its owner", async () => {
        const { realtime, recipients, repository, service } = setupNotificationsService();
        recipients.listActiveUserIds.mockResolvedValue(["a-1", "a-2"]);
        repository.createNotifications.mockResolvedValue([
            buildNotificationRecord({ id: "n-1", userId: "a-1" }),
            buildNotificationRecord({ id: "n-2", userId: "a-2" }),
        ]);

        const notifications = await service.notifyAdmins({ title: "Menu", body: "Belum ada menu" });

        expect(recipients.listActiveUserIds).toHaveBeenCalledWith("ADMIN");
        expect(repository.createNotifications).toHaveBeenCalledTimes(1);
        expect(repository.createNotifications).toHaveBeenCalledWith([
            { userId: "a-1", title: "Menu", body: "Belum ada menu" },
            { userId: "a-2", title: "Menu", body: "Belum ada menu" },
        ]);
        expect(notifications.map(item => item.id)).toEqual(["n-1", "n-2"]);
        expect(realtime.publish).toHaveBeenCalledTimes(2);
        expect(realtime.publish).toHaveBeenCalledWith(
            { userIds: ["a-2"] },
            { event: "notification", data: notifications[1] },
        );
    });

    it("does nothing when there is no active admin", async () => {
        const { realtime, repository, service } = setupNotificationsService();

        expect(await service.notifyAdmins({ title: "Menu", body: "Belum ada menu" })).toEqual([]);
        expect(repository.createNotifications).not.toHaveBeenCalled();
        expect(realtime.publish).not.toHaveBeenCalled();
    });

    it("keeps going when one publish fails", async () => {
        const { logger, realtime, recipients, repository, service } = setupNotificationsService();
        recipients.listActiveUserIds.mockResolvedValue(["a-1", "a-2"]);
        repository.createNotifications.mockResolvedValue([
            buildNotificationRecord({ id: "n-1", userId: "a-1" }),
            buildNotificationRecord({ id: "n-2", userId: "a-2" }),
        ]);
        realtime.publish.mockRejectedValueOnce(new Error("redis down"));

        expect(await service.notifyAdmins({ title: "Menu", body: "Belum ada menu" })).toHaveLength(2);
        expect(logger.warn).toHaveBeenCalledTimes(1);
    });
});

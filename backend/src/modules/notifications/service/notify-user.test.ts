import { describe, expect, it } from "vitest";
import { AnnouncementTargetNotFoundError } from "./interfaces/notifications.repository.js";
import { buildNotificationRecord } from "../test-utils/factory/notifications.factory.js";
import { setupNotificationsService } from "../test-utils/setup/notifications.setup.js";

describe("NotificationsService.notifyUser (unit)", () => {
    it("saves the notification and publishes it to that user", async () => {
        const { realtime, repository, service } = setupNotificationsService();
        repository.createNotification.mockResolvedValue(
            buildNotificationRecord({ id: "n-1", userId: "u-1", title: "Halo", body: "Pesan" }),
        );

        const notification = await service.notifyUser({ userId: "u-1", title: "Halo", body: "Pesan" });

        expect(repository.createNotification).toHaveBeenCalledWith({ userId: "u-1", title: "Halo", body: "Pesan" });
        expect(notification).toMatchObject({ id: "n-1", userId: "u-1" });
        expect(realtime.publish).toHaveBeenCalledWith(
            { userIds: ["u-1"] },
            { event: "notification", data: notification },
        );
    });

    it("logs a failed publish and still returns the saved notification", async () => {
        const { logger, realtime, repository, service } = setupNotificationsService();
        repository.createNotification.mockResolvedValue(buildNotificationRecord({ id: "n-1" }));
        realtime.publish.mockRejectedValue(new Error("redis down"));

        expect(await service.notifyUser({ userId: "u-1", title: "Halo", body: "Pesan" })).toMatchObject({ id: "n-1" });
        expect(logger.warn).toHaveBeenCalledWith(
            expect.objectContaining({ event: "notification" }),
            expect.stringContaining("live delivery failed"),
        );
    });

    it("does not publish when the save fails", async () => {
        const { realtime, repository, service } = setupNotificationsService();
        repository.createNotification.mockRejectedValue(new AnnouncementTargetNotFoundError("customer", "u-1"));

        await expect(service.notifyUser({ userId: "u-1", title: "Halo", body: "Pesan" })).rejects.toBeInstanceOf(
            AnnouncementTargetNotFoundError,
        );
        expect(realtime.publish).not.toHaveBeenCalled();
    });
});

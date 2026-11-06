import { describe, expect, it } from "vitest";
import { AnnouncementTargetNotFoundError } from "./interfaces/notifications.repository.js";
import { buildAnnouncementRecord, buildNotificationRecord } from "../test-utils/factory/notifications.factory.js";
import { setupNotificationsService } from "../test-utils/setup/notifications.setup.js";

const text = { title: "Libur", body: "Dapur tutup" };

describe("NotificationsService.broadcast (unit)", () => {
    it("sends a GLOBAL broadcast as an announcement", async () => {
        const { recipients, repository, service } = setupNotificationsService();
        recipients.countActiveUsers.mockResolvedValue(5);
        repository.createAnnouncement.mockResolvedValue(buildAnnouncementRecord({ id: "a-1" }));

        expect(await service.broadcast({ target: "GLOBAL", ...text })).toMatchObject({
            announcement: { id: "a-1", scope: "GLOBAL" },
            notification: null,
            recipientCount: 5,
        });
    });

    it("checks the package exists before announcing to it", async () => {
        const { repository, service, targets } = setupNotificationsService();
        repository.createAnnouncement.mockResolvedValue(
            buildAnnouncementRecord({ scope: "PACKAGE", packageId: "p-1" }),
        );

        const result = await service.broadcast({ target: "PACKAGE", packageId: "p-1", ...text });

        expect(targets.findMissingPackageIds).toHaveBeenCalledWith(["p-1"]);
        expect(result).toMatchObject({ announcement: { scope: "PACKAGE" }, notification: null });
    });

    it("answers 404 for an unknown package and creates nothing", async () => {
        const { repository, service, targets } = setupNotificationsService();
        targets.findMissingPackageIds.mockResolvedValue(["p-9"]);

        await expect(service.broadcast({ target: "PACKAGE", packageId: "p-9", ...text })).rejects.toMatchObject({
            code: "TARGET_NOT_FOUND",
            statusCode: 404,
            message: 'package not found: "p-9"',
        });
        expect(repository.createAnnouncement).not.toHaveBeenCalled();
    });

    it("answers 404 for an unknown schedule", async () => {
        const { service, targets } = setupNotificationsService();
        targets.findMissingScheduleIds.mockResolvedValue(["s-9"]);

        await expect(service.broadcast({ target: "SCHEDULE", menuScheduleId: "s-9", ...text })).rejects.toBeInstanceOf(
            AnnouncementTargetNotFoundError,
        );
    });

    it("announces to a schedule that exists", async () => {
        const { audience, recipients, repository, service } = setupNotificationsService();
        audience.findCustomerIdsForSchedule.mockResolvedValue(["u-1"]);
        recipients.filterActiveUserIds.mockResolvedValue(["u-1"]);
        repository.createAnnouncement.mockResolvedValue(
            buildAnnouncementRecord({ scope: "SCHEDULE", menuScheduleId: "s-1" }),
        );

        expect(await service.broadcast({ target: "SCHEDULE", menuScheduleId: "s-1", ...text })).toMatchObject({
            announcement: { scope: "SCHEDULE" },
            recipientCount: 1,
        });
    });

    it("sends a CUSTOMER broadcast as a notification to one active customer", async () => {
        const { realtime, recipients, repository, service } = setupNotificationsService();
        repository.createNotification.mockResolvedValue(buildNotificationRecord({ id: "n-1", userId: "u-1" }));

        const result = await service.broadcast({ target: "CUSTOMER", userId: "u-1", ...text });

        expect(recipients.filterActiveUserIds).toHaveBeenCalledWith(["u-1"], "CUSTOMER");
        expect(result).toMatchObject({ announcement: null, notification: { id: "n-1" }, recipientCount: 1 });
        expect(realtime.publish).toHaveBeenCalledWith(
            { userIds: ["u-1"] },
            expect.objectContaining({ event: "notification" }),
        );
    });

    it("answers the same 404 for a user who is not an active customer", async () => {
        const { recipients, repository, service } = setupNotificationsService();
        recipients.filterActiveUserIds.mockResolvedValue([]);

        await expect(service.broadcast({ target: "CUSTOMER", userId: "staff-1", ...text })).rejects.toMatchObject({
            code: "TARGET_NOT_FOUND",
            message: 'customer not found: "staff-1"',
        });
        expect(repository.createNotification).not.toHaveBeenCalled();
    });
});

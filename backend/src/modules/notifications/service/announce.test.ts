import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../shared/errors/validation-error.js";
import { buildAnnouncementRecord } from "../test-utils/factory/notifications.factory.js";
import { setupNotificationsService } from "../test-utils/setup/notifications.setup.js";

describe("NotificationsService.announce (unit)", () => {
    it("sends a GLOBAL announcement to the CUSTOMER role without loading ids", async () => {
        const { audience, realtime, recipients, repository, service } = setupNotificationsService();
        recipients.countActiveUsers.mockResolvedValue(42);
        repository.createAnnouncement.mockResolvedValue(buildAnnouncementRecord({ id: "a-1", scope: "GLOBAL" }));

        const result = await service.announce({ scope: "GLOBAL", title: "Libur", body: "Dapur tutup" });

        expect(result).toMatchObject({ recipientCount: 42, announcement: { id: "a-1", scope: "GLOBAL" } });
        expect(repository.createAnnouncement).toHaveBeenCalledWith({
            title: "Libur",
            body: "Dapur tutup",
            scope: "GLOBAL",
            packageId: null,
            menuScheduleId: null,
        });
        expect(recipients.countActiveUsers).toHaveBeenCalledWith("CUSTOMER");
        expect(recipients.listActiveUserIds).not.toHaveBeenCalled();
        expect(audience.findCustomerIdsForPackage).not.toHaveBeenCalled();
        expect(realtime.publish).toHaveBeenCalledWith(
            { roles: ["CUSTOMER"] },
            { event: "announcement", data: result.announcement },
        );
    });

    it("sends a PACKAGE announcement to the active customers on the package, as of today", async () => {
        const { audience, realtime, recipients, repository, service } = setupNotificationsService();
        audience.findCustomerIdsForPackage.mockResolvedValue(["u-1", "u-2", "u-3"]);
        recipients.filterActiveUserIds.mockResolvedValue(["u-1", "u-3"]);
        repository.createAnnouncement.mockResolvedValue(
            buildAnnouncementRecord({ scope: "PACKAGE", packageId: "p-1" }),
        );

        const result = await service.announce({ scope: "PACKAGE", packageId: "p-1", title: "Menu", body: "Baru" });

        expect(audience.findCustomerIdsForPackage).toHaveBeenCalledWith("p-1", Temporal.PlainDate.from("2026-11-03"));
        expect(recipients.filterActiveUserIds).toHaveBeenCalledWith(["u-1", "u-2", "u-3"], "CUSTOMER");
        expect(result.recipientCount).toBe(2);
        expect(realtime.publish).toHaveBeenCalledWith(
            { userIds: ["u-1", "u-3"] },
            { event: "announcement", data: result.announcement },
        );
    });

    it("sends a SCHEDULE announcement to the active customers with a slot on it", async () => {
        const { audience, recipients, repository, service } = setupNotificationsService();
        audience.findCustomerIdsForSchedule.mockResolvedValue(["u-1"]);
        recipients.filterActiveUserIds.mockResolvedValue(["u-1"]);
        repository.createAnnouncement.mockResolvedValue(
            buildAnnouncementRecord({ scope: "SCHEDULE", menuScheduleId: "s-1" }),
        );

        const result = await service.announce({
            scope: "SCHEDULE",
            menuScheduleId: "s-1",
            title: "Menu",
            body: "Ganti",
        });

        expect(audience.findCustomerIdsForSchedule).toHaveBeenCalledWith("s-1");
        expect(result.recipientCount).toBe(1);
    });

    it("saves the announcement and counts 0 recipients when nobody is concerned", async () => {
        const { realtime, repository, service } = setupNotificationsService();
        repository.createAnnouncement.mockResolvedValue(
            buildAnnouncementRecord({ scope: "PACKAGE", packageId: "p-1" }),
        );

        const result = await service.announce({ scope: "PACKAGE", packageId: "p-1", title: "Menu", body: "Baru" });

        expect(result.recipientCount).toBe(0);
        expect(repository.createAnnouncement).toHaveBeenCalledTimes(1);
        expect(realtime.publish).toHaveBeenCalledWith({ userIds: [] }, expect.anything());
    });

    it("logs a failed publish and still returns the saved announcement", async () => {
        const { logger, realtime, recipients, repository, service } = setupNotificationsService();
        recipients.countActiveUsers.mockResolvedValue(1);
        repository.createAnnouncement.mockResolvedValue(buildAnnouncementRecord({ id: "a-1" }));
        realtime.publish.mockRejectedValue(new Error("redis down"));

        expect(await service.announce({ scope: "GLOBAL", title: "Libur", body: "Tutup" })).toMatchObject({
            announcement: { id: "a-1" },
        });
        expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it("refuses an id that does not match the scope, before saving anything", async () => {
        const { repository, service } = setupNotificationsService();

        await expect(service.announce({ scope: "PACKAGE", title: "Menu", body: "Baru" })).rejects.toBeInstanceOf(
            ValidationError,
        );
        await expect(
            service.announce({ scope: "GLOBAL", packageId: "p-1", title: "Menu", body: "Baru" }),
        ).rejects.toBeInstanceOf(ValidationError);
        expect(repository.createAnnouncement).not.toHaveBeenCalled();
    });

    it("does not save when the audience cannot be resolved", async () => {
        const { audience, repository, service } = setupNotificationsService();
        audience.findCustomerIdsForPackage.mockRejectedValue(new Error("orders down"));

        await expect(
            service.announce({ scope: "PACKAGE", packageId: "p-1", title: "Menu", body: "Baru" }),
        ).rejects.toThrow("orders down");
        expect(repository.createAnnouncement).not.toHaveBeenCalled();
    });
});

import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../shared/errors/validation-error.js";
import { AnnouncementNotFoundError, AnnouncementTargetNotFoundError } from "./interfaces/notifications.repository.js";
import { buildAnnouncementRecord } from "../test-utils/factory/notifications.factory.js";
import { setupNotificationsService } from "../test-utils/setup/notifications.setup.js";

describe("NotificationsService.updateAnnouncement (unit)", () => {
    it("edits the text and sends nothing again", async () => {
        const { realtime, repository, service } = setupNotificationsService();
        repository.findAnnouncementById.mockResolvedValue(buildAnnouncementRecord({ id: "a-1" }));
        repository.updateAnnouncement.mockResolvedValue(buildAnnouncementRecord({ id: "a-1", title: "Baru" }));

        expect(await service.updateAnnouncement("a-1", { title: "Baru" })).toMatchObject({ title: "Baru" });
        expect(repository.updateAnnouncement).toHaveBeenCalledWith("a-1", { title: "Baru" });
        expect(realtime.publish).not.toHaveBeenCalled();
    });

    it("throws not found for an unknown announcement", async () => {
        const { service } = setupNotificationsService();

        await expect(service.updateAnnouncement("a-9", { title: "Baru" })).rejects.toBeInstanceOf(
            AnnouncementNotFoundError,
        );
    });

    it("moves an announcement to another package that exists", async () => {
        const { repository, service, targets } = setupNotificationsService();
        repository.findAnnouncementById.mockResolvedValue(
            buildAnnouncementRecord({ scope: "PACKAGE", packageId: "p-1" }),
        );
        repository.updateAnnouncement.mockResolvedValue(
            buildAnnouncementRecord({ scope: "PACKAGE", packageId: "p-2" }),
        );

        await service.updateAnnouncement("a-1", { packageId: "p-2" });

        expect(targets.findMissingPackageIds).toHaveBeenCalledWith(["p-2"]);
    });

    it("refuses an unknown package or schedule", async () => {
        const { repository, service, targets } = setupNotificationsService();
        repository.findAnnouncementById.mockResolvedValue(buildAnnouncementRecord({ scope: "GLOBAL" }));
        targets.findMissingPackageIds.mockResolvedValue(["p-9"]);

        await expect(service.updateAnnouncement("a-1", { scope: "PACKAGE", packageId: "p-9" })).rejects.toBeInstanceOf(
            AnnouncementTargetNotFoundError,
        );
        expect(repository.updateAnnouncement).not.toHaveBeenCalled();
    });

    it("accepts a scope change when the merged result is consistent", async () => {
        const { repository, service, targets } = setupNotificationsService();
        repository.findAnnouncementById.mockResolvedValue(
            buildAnnouncementRecord({ scope: "GLOBAL", packageId: null }),
        );
        repository.updateAnnouncement.mockResolvedValue(
            buildAnnouncementRecord({ scope: "PACKAGE", packageId: "p-1" }),
        );

        await service.updateAnnouncement("a-1", { scope: "PACKAGE", packageId: "p-1" });
        expect(targets.findMissingPackageIds).toHaveBeenCalledWith(["p-1"]);

        repository.findAnnouncementById.mockResolvedValue(
            buildAnnouncementRecord({ scope: "PACKAGE", packageId: "p-1" }),
        );
        await service.updateAnnouncement("a-1", { scope: "GLOBAL", packageId: null });
        expect(repository.updateAnnouncement).toHaveBeenLastCalledWith("a-1", { scope: "GLOBAL", packageId: null });
    });

    it("keeps an unchanged id without looking it up again", async () => {
        const { repository, service, targets } = setupNotificationsService();
        repository.findAnnouncementById.mockResolvedValue(
            buildAnnouncementRecord({ scope: "PACKAGE", packageId: "p-1" }),
        );
        repository.updateAnnouncement.mockResolvedValue(
            buildAnnouncementRecord({ scope: "PACKAGE", packageId: "p-1" }),
        );

        await service.updateAnnouncement("a-1", { scope: "PACKAGE", title: "Baru" });

        expect(targets.findMissingPackageIds).not.toHaveBeenCalled();
    });

    it("refuses a scope whose id is missing or left over", async () => {
        const { repository, service } = setupNotificationsService();
        repository.findAnnouncementById.mockResolvedValue(
            buildAnnouncementRecord({ scope: "PACKAGE", packageId: "p-1" }),
        );

        await expect(service.updateAnnouncement("a-1", { scope: "SCHEDULE" })).rejects.toBeInstanceOf(ValidationError);
        await expect(service.updateAnnouncement("a-1", { scope: "GLOBAL" })).rejects.toMatchObject({
            issues: [{ path: "packageId", message: "must be null when scope is GLOBAL" }],
        });
        await expect(service.updateAnnouncement("a-1", { packageId: null })).rejects.toMatchObject({
            issues: [{ path: "packageId", message: "is required when scope is PACKAGE" }],
        });
        expect(repository.updateAnnouncement).not.toHaveBeenCalled();
    });
});

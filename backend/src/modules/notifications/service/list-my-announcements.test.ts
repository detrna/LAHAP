import { describe, expect, it } from "vitest";
import { buildAnnouncementRecord } from "../test-utils/factory/notifications.factory.js";
import { setupNotificationsService } from "../test-utils/setup/notifications.setup.js";

describe("NotificationsService.listMyAnnouncements (unit)", () => {
    it("lists the announcements for the packages and schedules the customer qualifies for today", async () => {
        const { audience, repository, service } = setupNotificationsService();
        audience.findAnnouncementTargetsOf.mockResolvedValue({ packageIds: ["p-1"], scheduleIds: ["s-1", "s-2"] });
        repository.listAnnouncementsForAudience.mockResolvedValue({
            items: [buildAnnouncementRecord({ id: "a-1" })],
            total: 1,
        });

        const page = await service.listMyAnnouncements("u-1", { skip: 0, take: 20 });

        expect(page).toMatchObject({ total: 1, items: [{ id: "a-1" }] });
        expect(audience.findAnnouncementTargetsOf).toHaveBeenCalledWith("u-1", Temporal.PlainDate.from("2026-11-03"));
        expect(repository.listAnnouncementsForAudience).toHaveBeenCalledWith({
            packageIds: ["p-1"],
            scheduleIds: ["s-1", "s-2"],
            skip: 0,
            take: 20,
        });
    });
});

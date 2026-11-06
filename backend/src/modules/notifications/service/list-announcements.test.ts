import { describe, expect, it } from "vitest";
import { buildAnnouncementRecord } from "../test-utils/factory/notifications.factory.js";
import { setupNotificationsService } from "../test-utils/setup/notifications.setup.js";

describe("NotificationsService.listAnnouncements (unit)", () => {
    it("passes the filters and returns a page", async () => {
        const { repository, service } = setupNotificationsService();
        repository.listAnnouncements.mockResolvedValue({
            items: [buildAnnouncementRecord({ id: "a-1", scope: "PACKAGE", packageId: "p-1" })],
            total: 1,
        });

        const page = await service.listAnnouncements({ scope: "PACKAGE", packageId: "p-1", skip: 0, take: 10 });

        expect(page).toMatchObject({ total: 1, items: [{ id: "a-1", packageId: "p-1" }] });
        expect(repository.listAnnouncements).toHaveBeenCalledWith({
            scope: "PACKAGE",
            packageId: "p-1",
            skip: 0,
            take: 10,
        });
    });
});

import { describe, expect, it } from "vitest";
import { setupNotificationsService } from "../test-utils/setup/notifications.setup.js";

describe("NotificationsService.markAllNotificationsRead (unit)", () => {
    it("returns how many notifications changed", async () => {
        const { repository, service } = setupNotificationsService();
        repository.markAllNotificationsRead.mockResolvedValue(3);

        expect(await service.markAllNotificationsRead("u-1")).toEqual({ updatedCount: 3 });
        expect(repository.markAllNotificationsRead).toHaveBeenCalledWith("u-1");
    });
});

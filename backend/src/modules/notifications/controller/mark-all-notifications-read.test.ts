import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupNotificationsController } from "../test-utils/setup/notifications.setup.js";

describe("NotificationsController.markAllNotificationsRead (unit)", () => {
    it("answers how many notifications changed", async () => {
        const { controller, notificationsService } = setupNotificationsController();
        notificationsService.markAllNotificationsRead.mockResolvedValue({ updatedCount: 3 });
        const res = createMockResponse();

        await controller.markAllNotificationsRead(
            createMockRequest({ user: { userId: "u-1", name: "Rina", role: "CUSTOMER" } }),
            res,
        );

        expect(notificationsService.markAllNotificationsRead).toHaveBeenCalledWith("u-1");
        expect(res.json).toHaveBeenCalledWith({ data: { updatedCount: 3 } });
    });
});

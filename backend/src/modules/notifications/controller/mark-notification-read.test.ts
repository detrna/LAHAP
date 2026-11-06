import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupNotificationsController } from "../test-utils/setup/notifications.setup.js";

import { buildNotification } from "../test-utils/factory/notifications.factory.js";

describe("NotificationsController.markNotificationRead (unit)", () => {
    it("marks the notification of the signed-in user", async () => {
        const { controller, notificationsService } = setupNotificationsController();
        const notification = buildNotification({ isRead: true });
        notificationsService.markNotificationRead.mockResolvedValue(notification);
        const res = createMockResponse();

        await controller.markNotificationRead(
            createMockRequest({ user: { userId: "u-1", name: "Rina", role: "CUSTOMER" }, params: { id: "n-1" } }),
            res,
        );

        expect(notificationsService.markNotificationRead).toHaveBeenCalledWith("u-1", "n-1");
        expect(res.json).toHaveBeenCalledWith({ data: notification });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupNotificationsController } from "../test-utils/setup/notifications.setup.js";

import { buildAnnouncement } from "../test-utils/factory/notifications.factory.js";

describe("NotificationsController.getAnnouncement (unit)", () => {
    it("answers the announcement", async () => {
        const { controller, notificationsService } = setupNotificationsController();
        const announcement = buildAnnouncement();
        notificationsService.getAnnouncement.mockResolvedValue(announcement);
        const res = createMockResponse();

        await controller.getAnnouncement(createMockRequest({ params: { id: "a-1" } }), res);

        expect(notificationsService.getAnnouncement).toHaveBeenCalledWith("a-1");
        expect(res.json).toHaveBeenCalledWith({ data: announcement });
    });
});

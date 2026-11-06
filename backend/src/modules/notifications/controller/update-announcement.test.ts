import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupNotificationsController } from "../test-utils/setup/notifications.setup.js";

import { buildAnnouncement } from "../test-utils/factory/notifications.factory.js";

describe("NotificationsController.updateAnnouncement (unit)", () => {
    it("passes the body and answers the announcement", async () => {
        const { controller, notificationsService } = setupNotificationsController();
        const announcement = buildAnnouncement({ title: "Baru" });
        notificationsService.updateAnnouncement.mockResolvedValue(announcement);
        const res = createMockResponse();

        await controller.updateAnnouncement(createMockRequest({ params: { id: "a-1" }, body: { title: "Baru" } }), res);

        expect(notificationsService.updateAnnouncement).toHaveBeenCalledWith("a-1", { title: "Baru" });
        expect(res.json).toHaveBeenCalledWith({ data: announcement });
    });
});

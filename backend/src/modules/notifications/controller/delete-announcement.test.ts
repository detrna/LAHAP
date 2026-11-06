import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupNotificationsController } from "../test-utils/setup/notifications.setup.js";

describe("NotificationsController.deleteAnnouncement (unit)", () => {
    it("answers 204", async () => {
        const { controller, notificationsService } = setupNotificationsController();
        notificationsService.deleteAnnouncement.mockResolvedValue(undefined);
        const res = createMockResponse();

        await controller.deleteAnnouncement(createMockRequest({ params: { id: "a-1" } }), res);

        expect(notificationsService.deleteAnnouncement).toHaveBeenCalledWith("a-1");
        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.end).toHaveBeenCalled();
    });
});

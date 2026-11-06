import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupNotificationsController } from "../test-utils/setup/notifications.setup.js";

import { buildAnnouncement } from "../test-utils/factory/notifications.factory.js";

describe("NotificationsController.listMyAnnouncements (unit)", () => {
    it("answers the customer's page", async () => {
        const { controller, notificationsService } = setupNotificationsController();
        const items = [buildAnnouncement()];
        notificationsService.listMyAnnouncements.mockResolvedValue({ items, total: 1 });
        const res = createMockResponse();

        await controller.listMyAnnouncements(
            createMockRequest({
                user: { userId: "u-1", name: "Rina", role: "CUSTOMER" },
                pagination: { page: 1, limit: 20, offset: 0, skip: 0, take: 20 },
            }),
            res,
        );

        expect(notificationsService.listMyAnnouncements).toHaveBeenCalledWith("u-1", { skip: 0, take: 20 });
        expect(res.json).toHaveBeenCalledWith({ data: items, meta: expect.objectContaining({ total: 1 }) });
    });
});

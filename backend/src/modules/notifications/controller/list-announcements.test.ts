import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupNotificationsController } from "../test-utils/setup/notifications.setup.js";

import { buildAnnouncement } from "../test-utils/factory/notifications.factory.js";

describe("NotificationsController.listAnnouncements (unit)", () => {
    it("passes the filters and the pagination", async () => {
        const { controller, notificationsService } = setupNotificationsController();
        const items = [buildAnnouncement()];
        notificationsService.listAnnouncements.mockResolvedValue({ items, total: 1 });
        const res = createMockResponse();

        await controller.listAnnouncements(
            createMockRequest({
                query: { scope: "PACKAGE", packageId: "p-1" },
                pagination: { page: 1, limit: 20, offset: 0, skip: 0, take: 20 },
            }),
            res,
        );

        expect(notificationsService.listAnnouncements).toHaveBeenCalledWith({
            scope: "PACKAGE",
            packageId: "p-1",
            skip: 0,
            take: 20,
        });
        expect(res.json).toHaveBeenCalledWith({ data: items, meta: expect.objectContaining({ total: 1 }) });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupNotificationsController } from "../test-utils/setup/notifications.setup.js";

const user = { userId: "u-1", name: "Rina", role: "CUSTOMER" } as const;

describe("NotificationsController.listMyNotifications (unit)", () => {
    it("answers a page whose meta also carries the unread count", async () => {
        const { controller, notificationsService } = setupNotificationsController();
        notificationsService.listMyNotifications.mockResolvedValue({ items: [], total: 25, unreadCount: 4 });
        const res = createMockResponse();

        await controller.listMyNotifications(
            createMockRequest({
                user,
                query: { isRead: false },
                pagination: { page: 2, limit: 10, offset: 10, skip: 10, take: 10 },
            }),
            res,
        );

        expect(notificationsService.listMyNotifications).toHaveBeenCalledWith("u-1", {
            isRead: false,
            skip: 10,
            take: 10,
        });
        expect(res.json).toHaveBeenCalledWith({
            data: [],
            meta: {
                page: 2,
                limit: 10,
                total: 25,
                totalPages: 3,
                hasNextPage: true,
                hasPrevPage: true,
                unreadCount: 4,
            },
        });
    });
});

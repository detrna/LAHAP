import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupNotificationsController } from "../test-utils/setup/notifications.setup.js";

import { buildBroadcastResult } from "../test-utils/factory/notifications.factory.js";

describe("NotificationsController.broadcastNotification (unit)", () => {
    it("answers 201 with the result", async () => {
        const { controller, notificationsService } = setupNotificationsController();
        const result = buildBroadcastResult({ recipientCount: 3 });
        notificationsService.broadcast.mockResolvedValue(result);
        const res = createMockResponse();
        const body = { target: "GLOBAL", title: "Libur", body: "Tutup" };

        await controller.broadcastNotification(createMockRequest({ body }), res);

        expect(notificationsService.broadcast).toHaveBeenCalledWith(body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: result });
    });
});

import { describe, expect, it } from "vitest";
import { buildSlotStatusEvent } from "../test-utils/factory/realtime.factory.js";
import { setupRealtimeService } from "../test-utils/setup/realtime.setup.js";

describe("RealtimeService.publish (unit)", () => {
    it("publishes the audience and event as JSON on the realtime channel", async () => {
        const { service, eventBus } = setupRealtimeService();
        const event = buildSlotStatusEvent();

        await service.publish({ userIds: ["user-1"], roles: ["KITCHEN"] }, event);

        expect(eventBus.publish).toHaveBeenCalledWith(
            "realtime",
            JSON.stringify({ audience: { userIds: ["user-1"], roles: ["KITCHEN"] }, event }),
        );
    });

    it("publishes nothing when the audience is empty", async () => {
        const { service, eventBus } = setupRealtimeService();

        await service.publish({}, buildSlotStatusEvent());
        await service.publish({ userIds: [], roles: [] }, buildSlotStatusEvent());

        expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it("logs and rethrows when the bus fails", async () => {
        const { service, eventBus, logger } = setupRealtimeService();
        const failure = new Error("redis down");
        eventBus.publish.mockRejectedValueOnce(failure);

        await expect(service.publish({ userIds: ["user-1"] }, buildSlotStatusEvent())).rejects.toBe(failure);

        expect(logger.error).toHaveBeenCalledWith({ err: failure, event: "slot.status" }, "realtime publish failed");
    });
});

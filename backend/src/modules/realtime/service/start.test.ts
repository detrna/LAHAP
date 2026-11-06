import { describe, expect, it, vi } from "vitest";
import { setupRealtimeService } from "../test-utils/setup/realtime.setup.js";

describe("RealtimeService.start (unit)", () => {
    it("subscribes to the realtime channel", async () => {
        const { service, eventBus } = setupRealtimeService();

        await service.start();

        expect(eventBus.subscribe).toHaveBeenCalledWith("realtime", expect.any(Function));
    });

    it("subscribes only once when called twice", async () => {
        const { service, eventBus } = setupRealtimeService();

        await service.start();
        await service.start();

        expect(eventBus.subscribe).toHaveBeenCalledTimes(1);
    });

    it("hands messages from the channel to the hub", async () => {
        const { service, eventBus, hub } = setupRealtimeService();
        const deliver = vi.spyOn(hub, "deliver");
        await service.start();
        const onMessage = eventBus.subscribe.mock.calls[0]?.[1] as (message: string) => void;

        onMessage(
            JSON.stringify({
                audience: { userIds: ["user-1"] },
                event: { event: "notification", data: { id: "n-1" } },
            }),
        );

        expect(deliver).toHaveBeenCalledWith({ userIds: ["user-1"] }, 'event: notification\ndata: {"id":"n-1"}\n\n');
    });

    it("propagates a subscribe failure so the app does not start deaf", async () => {
        const { service, eventBus } = setupRealtimeService();
        eventBus.subscribe.mockRejectedValueOnce(new Error("redis down"));

        await expect(service.start()).rejects.toThrow("redis down");
    });
});

import { describe, expect, it, vi } from "vitest";
import { createMockConnection } from "../test-utils/mocks/realtime.mocks.js";
import { setupRealtimeService } from "../test-utils/setup/realtime.setup.js";

describe("RealtimeService.close (unit)", () => {
    it("closes every open stream and unsubscribes from the channel", async () => {
        const { service, eventBus, hub } = setupRealtimeService();
        const unsubscribe = vi.fn(async () => undefined);
        eventBus.subscribe.mockResolvedValueOnce(unsubscribe);
        const connection = createMockConnection();
        await service.start();
        service.connect(connection);

        await service.close();

        expect(connection.close).toHaveBeenCalledOnce();
        expect(hub.size).toBe(0);
        expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it("closes the streams even when the service never started", async () => {
        const { service } = setupRealtimeService();
        const connection = createMockConnection();
        service.connect(connection);

        await service.close();

        expect(connection.close).toHaveBeenCalledOnce();
    });

    it("logs a warning instead of throwing when unsubscribing fails", async () => {
        const { service, eventBus, logger } = setupRealtimeService();
        eventBus.subscribe.mockResolvedValueOnce(async () => {
            throw new Error("redis down");
        });
        await service.start();

        await expect(service.close()).resolves.toBeUndefined();

        expect(logger.warn).toHaveBeenCalledOnce();
    });

    it("can start again after closing", async () => {
        const { service, eventBus } = setupRealtimeService();
        await service.start();
        await service.close();

        await service.start();

        expect(eventBus.subscribe).toHaveBeenCalledTimes(2);
    });
});

import { describe, expect, it } from "vitest";
import { createMockConnection } from "../test-utils/mocks/realtime.mocks.js";
import { setupRealtimeService } from "../test-utils/setup/realtime.setup.js";

describe("RealtimeService.disconnect (unit)", () => {
    it("removes the connection and logs how long the stream was open", () => {
        const { service, hub, logger, clock } = setupRealtimeService();
        const connection = createMockConnection({ userId: "user-1" });
        service.connect(connection);
        clock.advance({ seconds: 90 });

        service.disconnect(connection.id, "user-1");

        expect(hub.size).toBe(0);
        expect(logger.info).toHaveBeenCalledWith({ userId: "user-1", durationMs: 90_000 }, "realtime stream closed");
    });

    it("logs only once when called twice for the same connection", () => {
        const { service, logger } = setupRealtimeService();
        const connection = createMockConnection();
        service.connect(connection);

        service.disconnect(connection.id, connection.userId);
        service.disconnect(connection.id, connection.userId);

        expect(logger.info).toHaveBeenCalledOnce();
    });

    it("ignores a connection that was never opened", () => {
        const { service, logger } = setupRealtimeService();

        expect(() => service.disconnect("unknown", "user-1")).not.toThrow();

        expect(logger.info).not.toHaveBeenCalled();
    });
});

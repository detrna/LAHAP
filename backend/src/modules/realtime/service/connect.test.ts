import { describe, expect, it } from "vitest";
import { RealtimeCapacityError } from "../domain/errors.js";
import { createMockConnection } from "../test-utils/mocks/realtime.mocks.js";
import { setupRealtimeService } from "../test-utils/setup/realtime.setup.js";

describe("RealtimeService.connect (unit)", () => {
    it("adds the connection to the hub", () => {
        const { service, hub } = setupRealtimeService();

        service.connect(createMockConnection());

        expect(hub.size).toBe(1);
    });

    it("refuses a connection at capacity and records nothing", () => {
        const { service, hub } = setupRealtimeService({ maxPerUser: 5, maxTotal: 1, maxBufferedBytes: 1024 });
        service.connect(createMockConnection({ userId: "a" }));
        const refused = createMockConnection({ userId: "b" });

        expect(() => service.connect(refused)).toThrow(RealtimeCapacityError);

        expect(hub.size).toBe(1);
        expect(service.openedAt.has(refused.id)).toBe(false);
    });
});

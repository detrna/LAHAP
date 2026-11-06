import { describe, expect, it } from "vitest";
import { setupRealtimeService } from "../test-utils/setup/realtime.setup.js";

describe("RealtimeService.getMillisecondsUntil (unit)", () => {
    it("returns the time left until the given epoch second", () => {
        const { service, clock } = setupRealtimeService();
        const now = clock.now().epochMilliseconds;

        expect(service.getMillisecondsUntil(now / 1000 + 3600)).toBe(3_600_000);
    });

    it("returns 0 for a moment that has passed", () => {
        const { service, clock } = setupRealtimeService();
        const now = clock.now().epochMilliseconds;

        expect(service.getMillisecondsUntil(now / 1000 - 10)).toBe(0);
    });
});

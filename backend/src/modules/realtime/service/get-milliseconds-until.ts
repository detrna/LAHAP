import type { RealtimeService } from "./realtime.service.js";

export function getMillisecondsUntil(this: RealtimeService, epochSeconds: number): number {
    return Math.max(0, epochSeconds * 1000 - this.clock.now().epochMilliseconds);
}

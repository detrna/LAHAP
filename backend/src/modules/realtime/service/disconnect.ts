import type { RealtimeService } from "./realtime.service.js";

export function disconnect(this: RealtimeService, connectionId: string, userId: string): void {
    this.hub.remove(connectionId);
    const openedAt = this.openedAt.get(connectionId);
    if (openedAt === undefined) return;
    this.openedAt.delete(connectionId);
    this.logger.info({ userId, durationMs: this.clock.now().epochMilliseconds - openedAt }, "realtime stream closed");
}

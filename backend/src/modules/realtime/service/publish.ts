import type { RealtimeAudience, RealtimeEvent } from "../domain/realtime-event.domain.js";
import { type RealtimeService, REALTIME_CHANNEL } from "./realtime.service.js";

export async function publish(this: RealtimeService, audience: RealtimeAudience, event: RealtimeEvent): Promise<void> {
    if ((audience.userIds?.length ?? 0) === 0 && (audience.roles?.length ?? 0) === 0) return;
    try {
        await this.eventBus.publish(REALTIME_CHANNEL, JSON.stringify({ audience, event }));
    } catch (err) {
        this.logger.error({ err, event: event.event }, "realtime publish failed");
        throw err;
    }
}

import type { RealtimeAudience, RealtimeEvent } from "../../realtime/domain/realtime-event.domain.js";
import type { NotificationsService } from "./notifications.service.js";

export async function publishQuietly(
    this: NotificationsService,
    audience: RealtimeAudience,
    event: RealtimeEvent,
): Promise<void> {
    try {
        await this.realtime.publish(audience, event);
    } catch (err) {
        this.logger.warn({ err, event: event.event }, "live delivery failed, the saved record is unaffected");
    }
}

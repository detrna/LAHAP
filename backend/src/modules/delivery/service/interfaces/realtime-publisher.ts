import type { RealtimeAudience, RealtimeEvent } from "../../../realtime/domain/realtime-event.domain.js";

export interface RealtimePublisher {
    publish(audience: RealtimeAudience, event: RealtimeEvent): Promise<void>;
}

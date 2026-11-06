import { formatSseEvent } from "../domain/sse-format.js";
import { realtimeEnvelopeSchema } from "../schema/realtime.schemas.js";
import type { RealtimeService } from "./realtime.service.js";

export function handleMessage(this: RealtimeService, message: string): void {
    let parsed: unknown;
    try {
        parsed = JSON.parse(message);
    } catch (err) {
        this.logger.warn({ err }, "dropped a realtime message that is not JSON");
        return;
    }

    const envelope = realtimeEnvelopeSchema.safeParse(parsed);
    if (!envelope.success) {
        this.logger.warn({ issues: envelope.error.issues }, "dropped a malformed realtime message");
        return;
    }

    this.hub.deliver(envelope.data.audience, formatSseEvent(envelope.data.event));
}

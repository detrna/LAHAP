import { type RealtimeService, REALTIME_CHANNEL } from "./realtime.service.js";

export async function start(this: RealtimeService): Promise<void> {
    if (this.unsubscribe !== null) return;
    this.unsubscribe = await this.eventBus.subscribe(REALTIME_CHANNEL, message => {
        this.handleMessage(message);
    });
}

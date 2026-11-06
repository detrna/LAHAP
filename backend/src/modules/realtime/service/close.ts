import type { RealtimeService } from "./realtime.service.js";

export async function close(this: RealtimeService): Promise<void> {
    this.hub.closeAll();
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = null;
    if (unsubscribe === null) return;
    try {
        await unsubscribe();
    } catch (err) {
        this.logger.warn({ err }, "realtime unsubscribe failed during shutdown");
    }
}

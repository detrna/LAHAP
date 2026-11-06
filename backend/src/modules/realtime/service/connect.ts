import type { Connection } from "./connection-hub.js";
import type { RealtimeService } from "./realtime.service.js";

export function connect(this: RealtimeService, connection: Connection): void {
    this.hub.add(connection);
    this.openedAt.set(connection.id, this.clock.now().epochMilliseconds);
}

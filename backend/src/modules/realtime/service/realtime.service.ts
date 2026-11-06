import type { Clock } from "../../../shared/ports/clock/clock.js";
import type { EventBus, EventBusUnsubscribe } from "../../../shared/ports/event-bus/event-bus.js";
import type { Logger } from "../../../shared/ports/logger/logger.js";
import { close } from "./close.js";
import { connect } from "./connect.js";
import type { ConnectionHub } from "./connection-hub.js";
import { disconnect } from "./disconnect.js";
import { getMillisecondsUntil } from "./get-milliseconds-until.js";
import { handleMessage } from "./handle-message.js";
import { publish } from "./publish.js";
import { start } from "./start.js";

export const REALTIME_CHANNEL = "realtime";

export class RealtimeService {
    unsubscribe: EventBusUnsubscribe | null = null;
    readonly openedAt = new Map<string, number>();

    constructor(
        readonly eventBus: EventBus,
        readonly hub: ConnectionHub,
        readonly logger: Logger,
        readonly clock: Clock,
    ) {}

    start = start;
    publish = publish;
    connect = connect;
    disconnect = disconnect;
    close = close;
    handleMessage = handleMessage;
    getMillisecondsUntil = getMillisecondsUntil;
}

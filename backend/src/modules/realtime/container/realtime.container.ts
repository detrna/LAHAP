import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { RealtimeController } from "../controller/realtime.controller.js";
import { createRealtimeRouter } from "../routes/realtime.routes.js";
import { ConnectionHub, MAX_BUFFERED_BYTES } from "../service/connection-hub.js";
import { RealtimeService } from "../service/realtime.service.js";

export class RealtimeContainer {
    readonly service: RealtimeService;
    readonly router: Router;

    constructor({ adapters, http }: ModuleDeps) {
        const hub = new ConnectionHub({
            maxPerUser: http.REALTIME_MAX_CONNECTIONS_PER_USER,
            maxTotal: http.REALTIME_MAX_CONNECTIONS,
            maxBufferedBytes: MAX_BUFFERED_BYTES,
        });
        this.service = new RealtimeService(adapters.eventBus, hub, adapters.logger, adapters.clock);
        const controller = new RealtimeController(this.service, http.REALTIME_PING_INTERVAL_SECONDS);
        this.router = createRealtimeRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { RealtimeController } from "../controller/realtime.controller.js";
import { createRealtimeRouter } from "../routes/realtime.routes.js";
import { RealtimeService } from "../service/realtime.service.js";

export class RealtimeContainer {
    readonly service: RealtimeService;
    readonly router: Router;

    constructor({ adapters }: ModuleDeps) {
        this.service = new RealtimeService();
        const controller = new RealtimeController(this.service);
        this.router = createRealtimeRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

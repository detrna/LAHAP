import type { RealtimeService } from "../service/realtime.service.js";

export class RealtimeController {
    constructor(readonly realtimeService: RealtimeService) {}
}

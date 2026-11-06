import type { RealtimeService } from "../service/realtime.service.js";
import { stream } from "./stream.js";

export class RealtimeController {
    constructor(
        readonly realtimeService: RealtimeService,
        readonly pingIntervalSeconds: number,
    ) {}

    stream = stream.bind(this);
}

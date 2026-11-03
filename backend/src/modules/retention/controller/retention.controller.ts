import type { RetentionService } from "../service/retention.service.js";

export class RetentionController {
    constructor(readonly retentionService: RetentionService) {}
}

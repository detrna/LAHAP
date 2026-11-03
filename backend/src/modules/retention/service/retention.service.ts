import type { RetentionRepository } from "./interfaces/retention.repository.js";

export class RetentionService {
    constructor(readonly retentionRepository: RetentionRepository) {}
}

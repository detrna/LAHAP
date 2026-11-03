import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { RetentionController } from "../controller/retention.controller.js";
import { PrismaRetentionRepository } from "../repository/prisma/retention-repository.js";
import { createRetentionRouter } from "../routes/retention.routes.js";
import { RetentionService } from "../service/retention.service.js";

export class RetentionContainer {
    readonly service: RetentionService;
    readonly router: Router;

    constructor({ db, adapters }: ModuleDeps) {
        const repository = new PrismaRetentionRepository(db);
        this.service = new RetentionService(repository);
        const controller = new RetentionController(this.service);
        this.router = createRetentionRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

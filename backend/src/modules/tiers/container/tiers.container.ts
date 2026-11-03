import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { TiersController } from "../controller/tiers.controller.js";
import { PrismaTiersRepository } from "../repository/prisma/tiers-repository.js";
import { createTiersRouter } from "../routes/tiers.routes.js";
import { TiersService } from "../service/tiers.service.js";

export class TiersContainer {
    readonly service: TiersService;
    readonly router: Router;

    constructor({ db, adapters }: ModuleDeps) {
        const repository = new PrismaTiersRepository(db);
        this.service = new TiersService(repository);
        const controller = new TiersController(this.service);
        this.router = createTiersRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

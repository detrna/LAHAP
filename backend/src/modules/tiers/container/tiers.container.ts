import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { TiersController } from "../controller/tiers.controller.js";
import { PrismaTiersRepository } from "../repository/prisma/tiers-repository.js";
import { createTiersRouter } from "../routes/tiers.routes.js";
import type { OrderStats } from "../service/interfaces/order-stats.js";
import type { PhotoKeys } from "../service/interfaces/photo-keys.js";
import { TiersService } from "../service/tiers.service.js";

export interface TiersContainerDeps extends ModuleDeps {
    readonly photoKeys: PhotoKeys;
    readonly orderStats: OrderStats;
}

export class TiersContainer {
    readonly service: TiersService;
    readonly router: Router;

    constructor({ db, adapters, photoKeys, orderStats }: TiersContainerDeps) {
        const repository = new PrismaTiersRepository(db);
        this.service = new TiersService(repository, adapters.objectStorage, adapters.clock, photoKeys, orderStats);
        const controller = new TiersController(this.service);
        this.router = createTiersRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

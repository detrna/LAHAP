import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { CatalogController } from "../controller/catalog.controller.js";
import { PrismaCatalogRepository } from "../repository/prisma/catalog-repository.js";
import { createCatalogRouter } from "../routes/catalog.routes.js";
import { CatalogService } from "../service/catalog.service.js";
import type { OrderActivity } from "../service/interfaces/order-activity.js";
import type { PhotoKeys } from "../service/interfaces/photo-keys.js";

export interface CatalogContainerDeps extends ModuleDeps {
    readonly photoKeys: PhotoKeys;
    readonly orderActivity: OrderActivity;
}

export class CatalogContainer {
    readonly service: CatalogService;
    readonly router: Router;

    constructor({ db, adapters, photoKeys, orderActivity }: CatalogContainerDeps) {
        const repository = new PrismaCatalogRepository(db);
        this.service = new CatalogService(repository, adapters.objectStorage, adapters.clock, photoKeys, orderActivity);
        const controller = new CatalogController(this.service);
        this.router = createCatalogRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

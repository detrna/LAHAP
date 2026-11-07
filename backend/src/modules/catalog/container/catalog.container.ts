import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { CatalogController } from "../controller/catalog.controller.js";
import { PrismaCatalogRepository } from "../repository/prisma/catalog-repository.js";
import { createCatalogRouter } from "../routes/catalog.routes.js";
import { CatalogService } from "../service/catalog.service.js";
import type { IngredientLookup } from "../service/interfaces/ingredient-lookup.js";
import type { OrderActivity } from "../service/interfaces/order-activity.js";
import type { ScheduleAnnouncer } from "../service/interfaces/schedule-announcer.js";
import type { PhotoKeys } from "../service/interfaces/photo-keys.js";

export interface CatalogContainerDeps extends ModuleDeps {
    readonly photoKeys: PhotoKeys;
    readonly ingredients: IngredientLookup;
    readonly orderActivity: OrderActivity;
    readonly announcer: ScheduleAnnouncer;
}

export class CatalogContainer {
    readonly service: CatalogService;
    readonly router: Router;

    constructor({ db, adapters, photoKeys, ingredients, orderActivity, announcer }: CatalogContainerDeps) {
        const repository = new PrismaCatalogRepository(db);
        this.service = new CatalogService(
            repository,
            adapters.objectStorage,
            adapters.clock,
            photoKeys,
            ingredients,
            orderActivity,
            announcer,
            adapters.logger,
        );
        const controller = new CatalogController(this.service);
        this.router = createCatalogRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

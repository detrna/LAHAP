import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { CatalogController } from "../controller/catalog.controller.js";
import { PrismaCatalogRepository } from "../repository/prisma/catalog-repository.js";
import { createCatalogRouter } from "../routes/catalog.routes.js";
import { CatalogService } from "../service/catalog.service.js";

export class CatalogContainer {
    readonly service: CatalogService;
    readonly router: Router;

    constructor({ db, adapters }: ModuleDeps) {
        const repository = new PrismaCatalogRepository(db);
        this.service = new CatalogService(repository);
        const controller = new CatalogController(this.service);
        this.router = createCatalogRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

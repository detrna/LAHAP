import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { KitchenController } from "../controller/kitchen.controller.js";
import { PrismaKitchenRepository } from "../repository/prisma/kitchen-repository.js";
import { createKitchenRouter } from "../routes/kitchen.routes.js";
import { KitchenService } from "../service/kitchen.service.js";

export class KitchenContainer {
    readonly service: KitchenService;
    readonly router: Router;

    constructor({ db, adapters }: ModuleDeps) {
        const repository = new PrismaKitchenRepository(db);
        this.service = new KitchenService(repository);
        const controller = new KitchenController(this.service);
        this.router = createKitchenRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

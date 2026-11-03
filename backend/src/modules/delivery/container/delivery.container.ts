import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { DeliveryController } from "../controller/delivery.controller.js";
import { PrismaDeliveryRepository } from "../repository/prisma/delivery-repository.js";
import { createDeliveryRouter } from "../routes/delivery.routes.js";
import { DeliveryService } from "../service/delivery.service.js";

export class DeliveryContainer {
    readonly service: DeliveryService;
    readonly router: Router;

    constructor({ db, adapters }: ModuleDeps) {
        const repository = new PrismaDeliveryRepository(db);
        this.service = new DeliveryService(repository);
        const controller = new DeliveryController(this.service);
        this.router = createDeliveryRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

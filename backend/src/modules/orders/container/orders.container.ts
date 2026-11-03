import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { OrdersController } from "../controller/orders.controller.js";
import { PrismaOrdersRepository } from "../repository/prisma/orders-repository.js";
import { createOrdersRouter } from "../routes/orders.routes.js";
import { OrdersService } from "../service/orders.service.js";

export class OrdersContainer {
    readonly service: OrdersService;
    readonly router: Router;

    constructor({ db, adapters }: ModuleDeps) {
        const repository = new PrismaOrdersRepository(db);
        this.service = new OrdersService(repository);
        const controller = new OrdersController(this.service);
        this.router = createOrdersRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

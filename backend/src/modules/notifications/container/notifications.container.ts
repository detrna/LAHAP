import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { NotificationsController } from "../controller/notifications.controller.js";
import { PrismaNotificationsRepository } from "../repository/prisma/notifications-repository.js";
import { createNotificationsRouter } from "../routes/notifications.routes.js";
import { NotificationsService } from "../service/notifications.service.js";

export class NotificationsContainer {
    readonly service: NotificationsService;
    readonly router: Router;

    constructor({ db, adapters }: ModuleDeps) {
        const repository = new PrismaNotificationsRepository(db);
        this.service = new NotificationsService(repository);
        const controller = new NotificationsController(this.service);
        this.router = createNotificationsRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

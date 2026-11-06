import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { NotificationsController } from "../controller/notifications.controller.js";
import { PrismaNotificationsRepository } from "../repository/prisma/notifications-repository.js";
import { createNotificationsRouter } from "../routes/notifications.routes.js";
import type { AnnouncementAudience } from "../service/interfaces/announcement-audience.js";
import type { AnnouncementTargets } from "../service/interfaces/announcement-targets.js";
import type { RealtimePublisher } from "../service/interfaces/realtime-publisher.js";
import type { RecipientDirectory } from "../service/interfaces/recipient-directory.js";
import { NotificationsService } from "../service/notifications.service.js";

export interface NotificationsContainerDeps extends ModuleDeps {
    readonly realtime: RealtimePublisher;
    readonly recipients: RecipientDirectory;
    readonly targets: AnnouncementTargets;
    readonly audience: AnnouncementAudience;
}

export class NotificationsContainer {
    readonly service: NotificationsService;
    readonly router: Router;

    constructor({ db, adapters, realtime, recipients, targets, audience }: NotificationsContainerDeps) {
        const repository = new PrismaNotificationsRepository(db);
        this.service = new NotificationsService(
            repository,
            realtime,
            recipients,
            targets,
            audience,
            adapters.clock,
            adapters.logger,
        );
        const controller = new NotificationsController(this.service);
        this.router = createNotificationsRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

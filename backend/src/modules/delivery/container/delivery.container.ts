import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { DeliveryController } from "../controller/delivery.controller.js";
import { PrismaDeliveryRepository } from "../repository/prisma/delivery-repository.js";
import { createDeliveryRouter } from "../routes/delivery.routes.js";
import { DeliveryService } from "../service/delivery.service.js";
import type { CourierSlots } from "../service/interfaces/courier-slots.js";
import type { DeliveryCatalog } from "../service/interfaces/delivery-catalog.js";
import type { ObstacleNotifier } from "../service/interfaces/obstacle-notifier.js";
import type { PhotoKeys } from "../service/interfaces/photo-keys.js";
import type { RealtimePublisher } from "../service/interfaces/realtime-publisher.js";
import type { UserDirectory } from "../service/interfaces/user-directory.js";

export interface DeliveryContainerDeps extends Pick<ModuleDeps, "db" | "adapters"> {
    readonly catalog: DeliveryCatalog;
    readonly slots: CourierSlots;
    readonly users: UserDirectory;
    readonly notifier: ObstacleNotifier;
    readonly realtime: RealtimePublisher;
    readonly photoKeys: PhotoKeys;
}

export class DeliveryContainer {
    readonly service: DeliveryService;
    readonly router: Router;

    constructor({ db, adapters, catalog, slots, users, notifier, realtime, photoKeys }: DeliveryContainerDeps) {
        const repository = new PrismaDeliveryRepository(db);
        this.service = new DeliveryService(repository, {
            catalog,
            slots,
            users,
            notifier,
            realtime,
            photoKeys,
            objectStorage: adapters.objectStorage,
            clock: adapters.clock,
            logger: adapters.logger,
        });
        const controller = new DeliveryController(this.service);
        this.router = createDeliveryRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

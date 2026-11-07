import type { Logger } from "../../../shared/ports/logger/logger.js";
import type { Clock } from "../../../shared/ports/clock/clock.js";
import type { ObjectStorage } from "../../../shared/ports/object-storage/object-storage.js";
import { findObstaclesByOrderIds } from "./find-obstacles-by-order-ids.js";
import { listMyDeliveries } from "./list-my-deliveries.js";
import { presentObstacleRecords } from "./present-obstacle-records.js";
import { reportObstacle } from "./report-obstacle.js";
import type { CourierSlots } from "./interfaces/courier-slots.js";
import type { DeliveryCatalog } from "./interfaces/delivery-catalog.js";
import type { DeliveryRepository } from "./interfaces/delivery.repository.js";
import type { ObstacleNotifier } from "./interfaces/obstacle-notifier.js";
import type { PhotoKeys } from "./interfaces/photo-keys.js";
import type { RealtimePublisher } from "./interfaces/realtime-publisher.js";
import type { UserDirectory } from "./interfaces/user-directory.js";

export interface DeliveryServiceDeps {
    readonly catalog: DeliveryCatalog;
    readonly slots: CourierSlots;
    readonly users: UserDirectory;
    readonly notifier: ObstacleNotifier;
    readonly realtime: RealtimePublisher;
    readonly photoKeys: PhotoKeys;
    readonly objectStorage: Pick<ObjectStorage, "getSignedUrl">;
    readonly clock: Clock;
    readonly logger: Logger;
}

export class DeliveryService {
    readonly catalog: DeliveryCatalog;
    readonly slots: CourierSlots;
    readonly users: UserDirectory;
    readonly notifier: ObstacleNotifier;
    readonly realtime: RealtimePublisher;
    readonly photoKeys: PhotoKeys;
    readonly objectStorage: Pick<ObjectStorage, "getSignedUrl">;
    readonly clock: Clock;
    readonly logger: Logger;

    constructor(
        readonly deliveryRepository: DeliveryRepository,
        deps: DeliveryServiceDeps,
    ) {
        this.catalog = deps.catalog;
        this.slots = deps.slots;
        this.users = deps.users;
        this.notifier = deps.notifier;
        this.realtime = deps.realtime;
        this.photoKeys = deps.photoKeys;
        this.objectStorage = deps.objectStorage;
        this.clock = deps.clock;
        this.logger = deps.logger;
    }

    listMyDeliveries = listMyDeliveries;
    reportObstacle = reportObstacle;
    findObstaclesByOrderIds = findObstaclesByOrderIds;
    presentObstacleRecords = presentObstacleRecords;
}

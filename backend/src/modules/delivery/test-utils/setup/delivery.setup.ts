import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import { createMockLogger, type MockLogger } from "../../../../../tests/utils/mocks/logger.js";
import { DeliveryController } from "../../controller/delivery.controller.js";
import { DeliveryService } from "../../service/delivery.service.js";
import {
    createMockCourierSlots,
    createMockDeliveryCatalog,
    createMockDeliveryRepository,
    createMockDeliveryService,
    createMockObjectStorage,
    createMockObstacleNotifier,
    createMockPhotoKeys,
    createMockRealtimePublisher,
    createMockUserDirectory,
    type Mocked,
    type MockedDeliveryService,
    type MockedObjectStorage,
} from "../mocks/delivery.mocks.js";
import type { CourierSlots } from "../../service/interfaces/courier-slots.js";
import type { DeliveryCatalog } from "../../service/interfaces/delivery-catalog.js";
import type { DeliveryRepository } from "../../service/interfaces/delivery.repository.js";
import type { ObstacleNotifier } from "../../service/interfaces/obstacle-notifier.js";
import type { PhotoKeys } from "../../service/interfaces/photo-keys.js";
import type { RealtimePublisher } from "../../service/interfaces/realtime-publisher.js";
import type { UserDirectory } from "../../service/interfaces/user-directory.js";

export interface DeliveryServiceSetup {
    readonly repository: Mocked<DeliveryRepository>;
    readonly catalog: Mocked<DeliveryCatalog>;
    readonly slots: Mocked<CourierSlots>;
    readonly users: Mocked<UserDirectory>;
    readonly notifier: Mocked<ObstacleNotifier>;
    readonly realtime: Mocked<RealtimePublisher>;
    readonly photoKeys: Mocked<PhotoKeys>;
    readonly objectStorage: MockedObjectStorage;
    readonly clock: FixedClock;
    readonly logger: MockLogger;
    readonly service: DeliveryService;
}

export interface DeliveryControllerSetup {
    readonly deliveryService: MockedDeliveryService;
    readonly controller: DeliveryController;
}

export function setupDeliveryService(): DeliveryServiceSetup {
    const repository = createMockDeliveryRepository();
    const catalog = createMockDeliveryCatalog();
    const slots = createMockCourierSlots();
    const users = createMockUserDirectory();
    const notifier = createMockObstacleNotifier();
    const realtime = createMockRealtimePublisher();
    const photoKeys = createMockPhotoKeys();
    const objectStorage = createMockObjectStorage();
    const clock = createFixedClock();
    const logger = createMockLogger();
    const service = new DeliveryService(repository, {
        catalog,
        slots,
        users,
        notifier,
        realtime,
        photoKeys,
        objectStorage,
        clock,
        logger,
    });
    return { repository, catalog, slots, users, notifier, realtime, photoKeys, objectStorage, clock, logger, service };
}

export function setupDeliveryController(): DeliveryControllerSetup {
    const deliveryService = createMockDeliveryService();
    return {
        deliveryService,
        controller: new DeliveryController(deliveryService as unknown as DeliveryService),
    };
}

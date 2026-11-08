import { createMockLogger, type MockLogger } from "../../../../../tests/utils/mocks/logger.js";
import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import { CatalogController } from "../../controller/catalog.controller.js";
import { CatalogService } from "../../service/catalog.service.js";
import type { AdminNotifier } from "../../service/interfaces/admin-notifier.js";
import type { CatalogRepository } from "../../service/interfaces/catalog.repository.js";
import type { CookDirectory } from "../../service/interfaces/cook-directory.js";
import type { IngredientLookup } from "../../service/interfaces/ingredient-lookup.js";
import type { OrderActivity } from "../../service/interfaces/order-activity.js";
import type { PhotoKeys } from "../../service/interfaces/photo-keys.js";
import type { ScheduleAnnouncer } from "../../service/interfaces/schedule-announcer.js";
import {
    createMockAdminNotifier,
    createMockCatalogRepository,
    createMockCatalogService,
    createMockCookDirectory,
    createMockIngredientLookup,
    createMockObjectStorage,
    createMockOrderActivity,
    createMockPhotoKeys,
    createMockScheduleAnnouncer,
    type Mocked,
    type MockedCatalogService,
    type MockedObjectStorage,
} from "../mocks/catalog.mocks.js";

export interface CatalogServiceSetup {
    readonly repository: Mocked<CatalogRepository>;
    readonly objectStorage: MockedObjectStorage;
    readonly clock: FixedClock;
    readonly photoKeys: Mocked<PhotoKeys>;
    readonly ingredients: Mocked<IngredientLookup>;
    readonly orderActivity: Mocked<OrderActivity>;
    readonly announcer: Mocked<ScheduleAnnouncer>;
    readonly adminNotifier: Mocked<AdminNotifier>;
    readonly cooks: Mocked<CookDirectory>;
    readonly logger: MockLogger;
    readonly service: CatalogService;
}

export interface CatalogControllerSetup {
    readonly catalogService: MockedCatalogService;
    readonly controller: CatalogController;
}

export function setupCatalogService(): CatalogServiceSetup {
    const repository = createMockCatalogRepository();
    const objectStorage = createMockObjectStorage();
    const clock = createFixedClock();
    const photoKeys = createMockPhotoKeys();
    const ingredients = createMockIngredientLookup();
    const orderActivity = createMockOrderActivity();
    const announcer = createMockScheduleAnnouncer();
    const adminNotifier = createMockAdminNotifier();
    const cooks = createMockCookDirectory();
    const logger = createMockLogger();
    return {
        repository,
        objectStorage,
        clock,
        photoKeys,
        ingredients,
        orderActivity,
        announcer,
        adminNotifier,
        cooks,
        logger,
        service: new CatalogService(repository, {
            objectStorage: objectStorage as unknown as ObjectStorage,
            clock,
            photoKeys,
            ingredients,
            orderActivity,
            announcer,
            adminNotifier,
            cooks,
            logger,
        }),
    };
}

export function setupCatalogController(): CatalogControllerSetup {
    const catalogService = createMockCatalogService();
    return { catalogService, controller: new CatalogController(catalogService as unknown as CatalogService) };
}

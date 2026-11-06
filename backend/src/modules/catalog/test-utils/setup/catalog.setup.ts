import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import { CatalogController } from "../../controller/catalog.controller.js";
import { CatalogService } from "../../service/catalog.service.js";
import type { CatalogRepository } from "../../service/interfaces/catalog.repository.js";
import type { OrderActivity } from "../../service/interfaces/order-activity.js";
import type { PhotoKeys } from "../../service/interfaces/photo-keys.js";
import {
    createMockCatalogRepository,
    createMockCatalogService,
    createMockObjectStorage,
    createMockOrderActivity,
    createMockPhotoKeys,
    type Mocked,
    type MockedCatalogService,
    type MockedObjectStorage,
} from "../mocks/catalog.mocks.js";

export interface CatalogServiceSetup {
    readonly repository: Mocked<CatalogRepository>;
    readonly objectStorage: MockedObjectStorage;
    readonly clock: FixedClock;
    readonly photoKeys: Mocked<PhotoKeys>;
    readonly orderActivity: Mocked<OrderActivity>;
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
    const orderActivity = createMockOrderActivity();
    return {
        repository,
        objectStorage,
        clock,
        photoKeys,
        orderActivity,
        service: new CatalogService(
            repository,
            objectStorage as unknown as ObjectStorage,
            clock,
            photoKeys,
            orderActivity,
        ),
    };
}

export function setupCatalogController(): CatalogControllerSetup {
    const catalogService = createMockCatalogService();
    return { catalogService, controller: new CatalogController(catalogService as unknown as CatalogService) };
}

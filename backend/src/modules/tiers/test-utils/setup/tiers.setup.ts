import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import { TiersController } from "../../controller/tiers.controller.js";
import type { OrderStats } from "../../service/interfaces/order-stats.js";
import type { PhotoKeys } from "../../service/interfaces/photo-keys.js";
import type { TiersRepository } from "../../service/interfaces/tiers.repository.js";
import { TiersService } from "../../service/tiers.service.js";
import {
    createMockObjectStorage,
    createMockOrderStats,
    createMockPhotoKeys,
    createMockTiersRepository,
    createMockTiersService,
    type Mocked,
    type MockedObjectStorage,
    type MockedTiersService,
} from "../mocks/tiers.mocks.js";

export interface TiersServiceSetup {
    readonly repository: Mocked<TiersRepository>;
    readonly objectStorage: MockedObjectStorage;
    readonly photoKeys: Mocked<PhotoKeys>;
    readonly orderStats: Mocked<OrderStats>;
    readonly clock: FixedClock;
    readonly service: TiersService;
}

export interface TiersControllerSetup {
    readonly tiersService: MockedTiersService;
    readonly controller: TiersController;
}

export function setupTiersService(now?: string): TiersServiceSetup {
    const repository = createMockTiersRepository();
    const objectStorage = createMockObjectStorage();
    const photoKeys = createMockPhotoKeys();
    const orderStats = createMockOrderStats();
    const clock = createFixedClock(now);
    return {
        repository,
        objectStorage,
        photoKeys,
        orderStats,
        clock,
        service: new TiersService(repository, objectStorage as unknown as ObjectStorage, clock, photoKeys, orderStats),
    };
}

export function setupTiersController(): TiersControllerSetup {
    const tiersService = createMockTiersService();
    return { tiersService, controller: new TiersController(tiersService as unknown as TiersService) };
}

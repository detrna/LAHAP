import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import { KitchenController } from "../../controller/kitchen.controller.js";
import type { KitchenCatalog } from "../../service/interfaces/kitchen-catalog.js";
import type { KitchenCustomers } from "../../service/interfaces/kitchen-customers.js";
import type { KitchenSlots } from "../../service/interfaces/kitchen-slots.js";
import { KitchenService } from "../../service/kitchen.service.js";
import {
    createMockKitchenCatalog,
    createMockKitchenCustomers,
    createMockKitchenService,
    createMockKitchenSlots,
    type Mocked,
    type MockedKitchenService,
} from "../mocks/kitchen.mocks.js";

export interface KitchenServiceSetup {
    readonly catalog: Mocked<KitchenCatalog>;
    readonly slots: Mocked<KitchenSlots>;
    readonly customers: Mocked<KitchenCustomers>;
    readonly clock: FixedClock;
    readonly service: KitchenService;
}

export interface KitchenControllerSetup {
    readonly kitchenService: MockedKitchenService;
    readonly controller: KitchenController;
}

export function setupKitchenService(): KitchenServiceSetup {
    const catalog = createMockKitchenCatalog();
    const slots = createMockKitchenSlots();
    const customers = createMockKitchenCustomers();
    const clock = createFixedClock();
    return { catalog, slots, customers, clock, service: new KitchenService(catalog, slots, customers, clock) };
}

export function setupKitchenController(): KitchenControllerSetup {
    const kitchenService = createMockKitchenService();
    return {
        kitchenService,
        controller: new KitchenController(kitchenService as unknown as KitchenService),
    };
}

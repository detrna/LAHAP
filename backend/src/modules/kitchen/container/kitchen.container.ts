import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { KitchenController } from "../controller/kitchen.controller.js";
import { createKitchenRouter } from "../routes/kitchen.routes.js";
import type { KitchenCatalog } from "../service/interfaces/kitchen-catalog.js";
import type { KitchenCustomers } from "../service/interfaces/kitchen-customers.js";
import type { KitchenSlots } from "../service/interfaces/kitchen-slots.js";
import { KitchenService } from "../service/kitchen.service.js";

export interface KitchenContainerDeps extends Pick<ModuleDeps, "adapters"> {
    readonly catalog: KitchenCatalog;
    readonly slots: KitchenSlots;
    readonly customers: KitchenCustomers;
}

export class KitchenContainer {
    readonly service: KitchenService;
    readonly router: Router;

    constructor({ adapters, catalog, slots, customers }: KitchenContainerDeps) {
        this.service = new KitchenService(catalog, slots, customers, adapters.clock);
        const controller = new KitchenController(this.service);
        this.router = createKitchenRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

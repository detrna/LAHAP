import type { Clock } from "../../../shared/ports/clock/clock.js";
import { getToCook } from "./get-to-cook.js";
import type { KitchenCatalog } from "./interfaces/kitchen-catalog.js";
import type { KitchenCustomers } from "./interfaces/kitchen-customers.js";
import type { KitchenSlots } from "./interfaces/kitchen-slots.js";

export class KitchenService {
    constructor(
        readonly catalog: KitchenCatalog,
        readonly slots: KitchenSlots,
        readonly customers: KitchenCustomers,
        readonly clock: Clock,
    ) {}

    getToCook = getToCook;
}

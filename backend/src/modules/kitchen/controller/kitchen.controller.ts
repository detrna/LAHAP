import type { KitchenService } from "../service/kitchen.service.js";

export class KitchenController {
    constructor(readonly kitchenService: KitchenService) {}
}

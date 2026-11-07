import type { KitchenService } from "../service/kitchen.service.js";
import { getToCook } from "./get-to-cook.js";

export class KitchenController {
    constructor(readonly kitchenService: KitchenService) {}

    getToCook = getToCook.bind(this);
}

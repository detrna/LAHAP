import type { KitchenRepository } from "./interfaces/kitchen.repository.js";

export class KitchenService {
    constructor(readonly kitchenRepository: KitchenRepository) {}
}

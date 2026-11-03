import type { DeliveryRepository } from "./interfaces/delivery.repository.js";

export class DeliveryService {
    constructor(readonly deliveryRepository: DeliveryRepository) {}
}

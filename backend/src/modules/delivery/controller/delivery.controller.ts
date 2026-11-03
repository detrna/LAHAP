import type { DeliveryService } from "../service/delivery.service.js";

export class DeliveryController {
    constructor(readonly deliveryService: DeliveryService) {}
}

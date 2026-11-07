import type { DeliveryService } from "../service/delivery.service.js";
import { listMyDeliveries } from "./list-my-deliveries.js";
import { reportObstacle } from "./report-obstacle.js";

export class DeliveryController {
    constructor(readonly deliveryService: DeliveryService) {}

    listMyDeliveries = listMyDeliveries.bind(this);
    reportObstacle = reportObstacle.bind(this);
}

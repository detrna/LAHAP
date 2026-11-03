import type { OrdersService } from "../service/orders.service.js";

export class OrdersController {
    constructor(readonly ordersService: OrdersService) {}
}

import type { OrdersRepository } from "./interfaces/orders.repository.js";

export class OrdersService {
    constructor(readonly ordersRepository: OrdersRepository) {}
}

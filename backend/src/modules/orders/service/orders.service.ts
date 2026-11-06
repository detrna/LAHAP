import { findLastSuccessEndDates } from "./find-last-success-end-dates.js";
import { findUserIdsWithLastSuccessEndBefore } from "./find-user-ids-with-last-success-end-before.js";
import type { OrdersRepository } from "./interfaces/orders.repository.js";

export class OrdersService {
    constructor(readonly ordersRepository: OrdersRepository) {}

    findLastSuccessEndDates = findLastSuccessEndDates;
    findUserIdsWithLastSuccessEndBefore = findUserIdsWithLastSuccessEndBefore;
}

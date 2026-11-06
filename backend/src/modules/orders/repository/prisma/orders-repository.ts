import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { OrdersRepository } from "../../service/interfaces/orders.repository.js";
import { findLastSuccessEndDates } from "./find-last-success-end-dates.js";
import { findUserIdsWithLastSuccessEndBefore } from "./find-user-ids-with-last-success-end-before.js";

export class PrismaOrdersRepository implements OrdersRepository {
    constructor(readonly db: Db) {}

    findLastSuccessEndDates = findLastSuccessEndDates;
    findUserIdsWithLastSuccessEndBefore = findUserIdsWithLastSuccessEndBefore;
}

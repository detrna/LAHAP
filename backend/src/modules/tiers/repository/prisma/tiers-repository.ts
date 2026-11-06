import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { TiersRepository } from "../../service/interfaces/tiers.repository.js";
import { findMembershipByUserId } from "./find-membership-by-user-id.js";

export class PrismaTiersRepository implements TiersRepository {
    constructor(readonly db: Db) {}

    findMembershipByUserId = findMembershipByUserId;
}

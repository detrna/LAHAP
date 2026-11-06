import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { TiersRepository } from "../../service/interfaces/tiers.repository.js";
import { changeMembershipTier } from "./change-membership-tier.js";
import { createTier } from "./create-tier.js";
import { deleteMembership } from "./delete-membership.js";
import { deleteTier } from "./delete-tier.js";
import { findMembershipByUserId } from "./find-membership-by-user-id.js";
import { findTierById } from "./find-tier-by-id.js";
import { listAllTiers } from "./list-all-tiers.js";
import { listMembershipWindows } from "./list-membership-windows.js";
import { listTiers } from "./list-tiers.js";
import { updateTier } from "./update-tier.js";
import { upsertMembership } from "./upsert-membership.js";
import { withUserLock } from "./with-user-lock.js";

export class PrismaTiersRepository implements TiersRepository {
    constructor(
        readonly db: Db,
        readonly orm: Db["orm"] = db.orm,
    ) {}

    listTiers = listTiers;
    findTierById = findTierById;
    createTier = createTier;
    updateTier = updateTier;
    deleteTier = deleteTier;
    listAllTiers = listAllTiers;
    findMembershipByUserId = findMembershipByUserId;
    listMembershipWindows = listMembershipWindows;
    upsertMembership = upsertMembership;
    changeMembershipTier = changeMembershipTier;
    deleteMembership = deleteMembership;
    withUserLock = withUserLock;
}

import type { Clock } from "../../../shared/ports/clock/clock.js";
import type { ObjectStorage } from "../../../shared/ports/object-storage/object-storage.js";
import { createTier } from "./create-tier.js";
import { deleteTier } from "./delete-tier.js";
import { getActiveDiscount } from "./get-active-discount.js";
import { getMembership } from "./get-membership.js";
import { getMembershipOverview } from "./get-membership-overview.js";
import { getTier } from "./get-tier.js";
import type { OrderStats } from "./interfaces/order-stats.js";
import type { PhotoKeys } from "./interfaces/photo-keys.js";
import type { TiersRepository } from "./interfaces/tiers.repository.js";
import { listPublicTiers } from "./list-public-tiers.js";
import { listTiers } from "./list-tiers.js";
import { presentTier, presentTiers } from "./present-tiers.js";
import { reevaluate } from "./reevaluate.js";
import { toMembership } from "./to-membership.js";
import { updateTier } from "./update-tier.js";

export class TiersService {
    constructor(
        readonly tiersRepository: TiersRepository,
        readonly objectStorage: ObjectStorage,
        readonly clock: Clock,
        readonly photoKeys: PhotoKeys,
        readonly orderStats: OrderStats,
    ) {}

    presentTiers = presentTiers;
    presentTier = presentTier;
    toMembership = toMembership;
    listTiers = listTiers;
    listPublicTiers = listPublicTiers;
    getTier = getTier;
    createTier = createTier;
    updateTier = updateTier;
    deleteTier = deleteTier;
    getMembership = getMembership;
    getMembershipOverview = getMembershipOverview;
    getActiveDiscount = getActiveDiscount;
    reevaluate = reevaluate;
}

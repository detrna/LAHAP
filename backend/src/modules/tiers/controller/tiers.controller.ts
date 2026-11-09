import type { TiersService } from "../service/tiers.service.js";
import { createTier } from "./create-tier.js";
import { deleteTier } from "./delete-tier.js";
import { getMyMembership } from "./get-my-membership.js";
import { getTier } from "./get-tier.js";
import { listPublicTiers } from "./list-public-tiers.js";
import { listTiers } from "./list-tiers.js";
import { updateTier } from "./update-tier.js";

export class TiersController {
    constructor(readonly tiersService: TiersService) {}

    listTiers = listTiers.bind(this);
    listPublicTiers = listPublicTiers.bind(this);
    getTier = getTier.bind(this);
    createTier = createTier.bind(this);
    updateTier = updateTier.bind(this);
    deleteTier = deleteTier.bind(this);
    getMyMembership = getMyMembership.bind(this);
}

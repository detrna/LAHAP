import type { Clock } from "../../../shared/ports/clock/clock.js";
import type { ObjectStorage } from "../../../shared/ports/object-storage/object-storage.js";
import { getMembership } from "./get-membership.js";
import type { TiersRepository } from "./interfaces/tiers.repository.js";
import { toMembership, toTier } from "./to-membership.js";

export class TiersService {
    constructor(
        readonly tiersRepository: TiersRepository,
        readonly objectStorage: ObjectStorage,
        readonly clock: Clock,
    ) {}

    getMembership = getMembership;
    toMembership = toMembership;
    toTier = toTier;
}

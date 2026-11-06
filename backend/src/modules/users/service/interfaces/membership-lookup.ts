import type { Membership } from "../../../tiers/domain/membership.domain.js";

export interface MembershipLookup {
    getMembership(userId: string): Promise<Membership | null>;
}

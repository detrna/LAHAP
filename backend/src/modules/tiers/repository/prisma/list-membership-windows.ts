import type { MembershipWindowRecord } from "../../service/interfaces/tiers.repository.js";
import { TiersRepositoryFailureError } from "../../service/interfaces/tiers.repository.js";
import type { PrismaTiersRepository } from "./tiers-repository.js";

export async function listMembershipWindows(this: PrismaTiersRepository): Promise<readonly MembershipWindowRecord[]> {
    try {
        const rows = await this.orm.public.Membership.select("tierId", "startedAt", "expiresAt").all();
        return rows.map(row => ({ tierId: row.tierId, startedAt: row.startedAt, expiresAt: row.expiresAt }));
    } catch (cause) {
        throw new TiersRepositoryFailureError("listMembershipWindows", cause);
    }
}

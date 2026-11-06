import { TiersRepositoryFailureError } from "../../service/interfaces/tiers.repository.js";
import type { PrismaTiersRepository } from "./tiers-repository.js";

export async function changeMembershipTier(this: PrismaTiersRepository, userId: string, tierId: string): Promise<void> {
    try {
        await this.orm.public.Membership.where({ userId }).updateAndCount({ tierId });
    } catch (cause) {
        throw new TiersRepositoryFailureError("changeMembershipTier", cause);
    }
}

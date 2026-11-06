import { TiersRepositoryFailureError } from "../../service/interfaces/tiers.repository.js";
import type { PrismaTiersRepository } from "./tiers-repository.js";

export async function deleteMembership(this: PrismaTiersRepository, userId: string): Promise<void> {
    try {
        await this.orm.public.Membership.where({ userId }).deleteAndCount();
    } catch (cause) {
        throw new TiersRepositoryFailureError("deleteMembership", cause);
    }
}

import type { Tier } from "../domain/tier.domain.js";
import type { TiersService } from "./tiers.service.js";

export interface ListTiersInput {
    readonly skip: number;
    readonly take: number;
}

export interface TierPage {
    readonly items: readonly Tier[];
    readonly total: number;
}

export async function listTiers(this: TiersService, input: ListTiersInput): Promise<TierPage> {
    const { items, total } = await this.tiersRepository.listTiers(input);
    return { items: await this.presentTiers(items), total };
}

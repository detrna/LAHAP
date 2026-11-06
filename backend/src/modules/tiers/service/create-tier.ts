import type { Tier } from "../domain/tier.domain.js";
import type { TiersService } from "./tiers.service.js";

export const DEFAULT_DURATION_DAYS = 30;

export interface CreateTierInput {
    readonly name: string;
    readonly description?: string | null | undefined;
    readonly requiredSubscriptionDays: number;
    readonly durationDays?: number | undefined;
    readonly discountPercent: number;
    readonly photoKey?: string | null | undefined;
}

export async function createTier(this: TiersService, input: CreateTierInput): Promise<Tier> {
    const photoKey = input.photoKey ?? null;
    if (photoKey !== null) await this.photoKeys.assertPhotoKeyExists(photoKey, "photoKey");

    const record = await this.tiersRepository.createTier({
        name: input.name,
        description: input.description ?? null,
        requiredSubscriptionDays: input.requiredSubscriptionDays,
        durationDays: input.durationDays ?? DEFAULT_DURATION_DAYS,
        discountPercent: input.discountPercent,
        photoKey,
    });
    return this.presentTier(record);
}

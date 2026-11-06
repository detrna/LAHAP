export interface PromoUsage {
    countPromoUses(promoCodeIds: readonly string[]): Promise<ReadonlyMap<string, number>>;
    countPromoUsesByUser(promoCodeId: string, userId: string): Promise<number>;
    hasPendingSubscriptions(promoCodeId: string): Promise<boolean>;
}

export const noPromoUsage: PromoUsage = {
    countPromoUses: async () => new Map(),
    countPromoUsesByUser: async () => 0,
    hasPendingSubscriptions: async () => false,
};

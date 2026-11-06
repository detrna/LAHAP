export interface TierDiscount {
    readonly tierId: string;
    readonly discountPercent: number;
}

export interface TierDiscountProvider {
    getActiveDiscount(userId: string): Promise<TierDiscount | null>;
    reevaluate(userId: string, options: { readonly renewWindow: boolean }): Promise<void>;
}

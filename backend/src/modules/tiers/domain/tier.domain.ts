export interface Tier {
    readonly id: string;
    readonly name: string;
    readonly description?: string | null | undefined;
    readonly requiredSubscriptionDays: number;
    readonly durationDays: number;
    readonly discountPercent: number;
    readonly photoKey: string | null;
    readonly photoUrl: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly memberCount?: number | undefined;
    readonly totalDiscountGiven?: number | undefined;
}

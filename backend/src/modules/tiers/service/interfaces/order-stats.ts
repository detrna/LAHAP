export interface OrderStats {
    countPaidServiceDays(userId: string): Promise<number>;
    sumTierDiscounts(tierIds: readonly string[]): Promise<ReadonlyMap<string, number>>;
}

export const noOrderStats: OrderStats = {
    countPaidServiceDays: async () => 0,
    sumTierDiscounts: async () => new Map(),
};

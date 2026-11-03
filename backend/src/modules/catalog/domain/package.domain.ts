import type { MealTimeView } from "../../../shared/utils/meal-time/meal-time.js";

export const ORDER_PERIODS = ["Harian", "Mingguan", "Bulanan"] as const;
export type OrderPeriod = (typeof ORDER_PERIODS)[number];

export interface Package {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly basePrice: number;
    readonly periods: readonly OrderPeriod[];
    readonly deliveryTimes: readonly MealTimeView[];
    readonly deliveryFreeRadius: number | null;
    readonly deliveryMaxDistance: number | null;
    readonly deliveryPricePerKm: number | null;
    readonly photoKey: string;
    readonly photoUrl: string;
    readonly startAt: string;
    readonly endAt: string | null;
    readonly isActive: boolean;
    readonly isAvailable: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly activeSubscriberCount?: number | undefined;
}

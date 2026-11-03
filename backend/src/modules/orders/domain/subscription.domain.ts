import type { OrderPeriod, Package } from "../../catalog/domain/package.domain.js";
import type { PromoCode } from "../../promo-codes/domain/promo-code.domain.js";
import type { Tier } from "../../tiers/domain/tier.domain.js";
import type { UserSummary } from "../../users/domain/user.domain.js";
import type { Order } from "./order.domain.js";
import type { Payment } from "./payment.domain.js";

export const SUBSCRIPTION_STATUSES = ["Pending", "Success", "Expire", "Dibatalkan"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_DISPLAY_STATUSES = ["Akan Datang", "Aktif", "Selesai"] as const;
export type SubscriptionDisplayStatus = (typeof SUBSCRIPTION_DISPLAY_STATUSES)[number];

export const PURCHASE_TYPES = ["Online", "Offline"] as const;
export type PurchaseType = (typeof PURCHASE_TYPES)[number];

export interface Subscription {
    readonly id: string;
    readonly userId: string;
    readonly packageId: string;
    readonly promoCodeId: string | null;
    readonly tierId: string | null;
    readonly status: SubscriptionStatus;
    readonly displayStatus: SubscriptionDisplayStatus | null;
    readonly purchaseType: PurchaseType;
    readonly period: OrderPeriod;
    readonly startDate: string;
    readonly endDate: string;
    readonly isDelivery: boolean;
    readonly recipientName: string;
    readonly deliveryAddress: string | null;
    readonly deliveryLatitude: number | null;
    readonly deliveryLongitude: number | null;
    readonly deliveryDistanceKm: number | null;
    readonly notes: string | null;
    readonly pricePerPortion: number;
    readonly foodSubtotal: number;
    readonly tierDiscount: number;
    readonly promoDiscount: number;
    readonly deliveryFeePerSlot: number;
    readonly deliveryFeeTotal: number;
    readonly totalPrice: number;
    readonly needsRefund: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly user?: UserSummary | undefined;
    readonly package?: Package | undefined;
    readonly promoCode?: PromoCode | null | undefined;
    readonly tier?: Tier | null | undefined;
    readonly orders?: readonly Order[] | undefined;
    readonly payments?: readonly Payment[] | undefined;
}

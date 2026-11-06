import type { SubscriptionStatus } from "./subscription.domain.js";

export const PROMO_USE_STATUSES: readonly SubscriptionStatus[] = ["Pending", "Success"];
export const PROMO_CUSTOMER_USE_STATUSES: readonly SubscriptionStatus[] = ["Success"];

import { PROMO_CUSTOMER_USE_STATUSES, PROMO_USE_STATUSES } from "../../domain/promo-usage.js";
import type { OrdersService } from "../orders.service.js";

export async function countPromoUses(
    this: OrdersService,
    promoCodeIds: readonly string[],
): Promise<ReadonlyMap<string, number>> {
    if (promoCodeIds.length === 0) return new Map();
    return this.ordersRepository.countPromoUses([...new Set(promoCodeIds)], PROMO_USE_STATUSES);
}

export async function countPromoUsesByUser(this: OrdersService, promoCodeId: string, userId: string): Promise<number> {
    return this.ordersRepository.countPromoUsesByUser(promoCodeId, userId, PROMO_CUSTOMER_USE_STATUSES);
}

export async function hasPendingSubscriptions(this: OrdersService, promoCodeId: string): Promise<boolean> {
    return this.ordersRepository.hasSubscriptionsWithPromo(promoCodeId, ["Pending"]);
}

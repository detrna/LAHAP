import type { MealTimeView } from "../../../shared/utils/meal-time/meal-time.js";
import type { Allergy } from "../../catalog/domain/allergy.domain.js";
import type { Menu } from "../../catalog/domain/menu.domain.js";
import type { PromoCheck } from "../../promo-codes/domain/promo-code.domain.js";
import type { Payment, PaymentSession } from "./payment.domain.js";
import type { Subscription } from "./subscription.domain.js";

export interface CheckoutSlotPreview {
    readonly menuScheduleId: string;
    readonly date: string;
    readonly deliveryTime: MealTimeView;
    readonly menu: Menu;
    readonly hasAlternative: boolean;
    readonly clashingAllergies: readonly Allergy[];
}

export interface CheckoutPreview {
    readonly slots: readonly CheckoutSlotPreview[];
    readonly slotCount: number;
    readonly startDate: string;
    readonly endDate: string;
    readonly cutoffAt: string;
    readonly delivery: {
        readonly available: boolean;
        readonly distanceKm: number | null;
        readonly maxDistanceKm: number;
        readonly feePerSlot: number;
    };
    readonly promo: PromoCheck | null;
    readonly pricePerPortion: number;
    readonly foodSubtotal: number;
    readonly tierDiscount: number;
    readonly promoDiscount: number;
    readonly deliveryFeePerSlot: number;
    readonly deliveryFeeTotal: number;
    readonly totalPrice: number;
}

export interface CheckoutResult {
    readonly subscription: Subscription;
    readonly payment: Payment;
    readonly paymentSession: PaymentSession | null;
}

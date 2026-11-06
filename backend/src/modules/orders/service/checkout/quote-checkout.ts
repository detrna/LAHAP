import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { findClashingAllergies } from "../../../../shared/utils/allergy-clash/allergy-clash.js";
import type { Menu } from "../../../catalog/domain/menu.domain.js";
import type { Package } from "../../../catalog/domain/package.domain.js";
import type { ScheduleSummary } from "../../../catalog/domain/schedule.domain.js";
import type { PromoCheck } from "../../../promo-codes/domain/promo-code.domain.js";
import type { PromoCheckResult } from "../../../promo-codes/domain/promo-check.js";
import type { CheckoutPreview } from "../../domain/checkout.domain.js";
import { cutoffAt } from "../../domain/cut-off.js";
import { quoteDelivery, resolveDeliveryRates, type DeliveryQuote } from "../../domain/delivery-fee.js";
import { computeOrderTotal, foodSubtotalOf, type OrderTotal } from "../../domain/order-total.js";
import type { OrdersService } from "../orders.service.js";
import type { CheckoutInput } from "./checkout-input.js";

export interface CheckoutQuote {
    readonly preview: CheckoutPreview;
    readonly package: Package;
    readonly schedules: readonly ScheduleSummary[];
    readonly total: OrderTotal;
    readonly promoCodeId: string | null;
    readonly promoQuota: number | null;
    readonly delivery: DeliveryQuote | null;
    readonly startDate: Temporal.PlainDate;
    readonly endDate: Temporal.PlainDate;
    readonly paymentTimeoutMinutes: number;
}

function toPromoCheck(result: PromoCheckResult | null, applied: boolean): PromoCheck | null {
    if (result === null) return null;
    if (!result.valid) return { code: result.code, applied: false, reason: result.reason };
    return { code: result.promoCode.code, applied, reason: applied ? null : "TIER_DISCOUNT_LARGER" };
}

function menusBySchedule(schedules: readonly ScheduleSummary[], menus: readonly Menu[]): readonly Menu[] {
    const byId = new Map(menus.map(menu => [menu.id, menu]));
    return schedules.map(schedule => {
        const menu = schedule.primaryMenuId === null ? undefined : byId.get(schedule.primaryMenuId);
        if (menu === undefined) throw new InvalidStateError("slot is not available");
        return menu;
    });
}

export async function quoteCheckout(this: OrdersService, userId: string, input: CheckoutInput): Promise<CheckoutQuote> {
    const now = this.clock.now();
    const today = now.toPlainDate();

    const [pkg] = await this.catalog.getPackagesByIds([input.packageId]);
    if (pkg === undefined || !pkg.isAvailable) throw new InvalidStateError("package is not available");
    if (!pkg.periods.includes(input.period)) throw new InvalidStateError("package does not offer this period");

    const schedules = await this.selectCheckoutSlots(pkg, input, today);
    const first = schedules[0];
    const last = schedules.at(-1);
    if (first === undefined || last === undefined) throw new InvalidStateError("no slots to order");

    const primaryMenuIds = schedules.flatMap(schedule =>
        schedule.primaryMenuId === null ? [] : [schedule.primaryMenuId],
    );
    const foodSubtotal = foodSubtotalOf(pkg.basePrice, schedules.length);
    const [menus, [profile], settings, tier, promoResult] = await Promise.all([
        this.catalog.getMenusByIds(primaryMenuIds),
        this.customers.getAllergyProfiles([userId]),
        this.settings.getSettings(),
        this.tierDiscounts.getActiveDiscount(userId),
        input.promoCode === null
            ? Promise.resolve(null)
            : this.promoChecker.checkPromo({ code: input.promoCode, userId, foodSubtotal }),
    ]);
    const slotMenus = menusBySchedule(schedules, menus);
    const allergyIds = profile?.allergyIds ?? [];

    const rates = resolveDeliveryRates(pkg, settings);
    const delivery =
        input.deliveryLatitude !== null && input.deliveryLongitude !== null
            ? quoteDelivery(
                  { lat: settings.latitude, lng: settings.longitude },
                  { lat: input.deliveryLatitude, lng: input.deliveryLongitude },
                  rates,
              )
            : null;
    const deliveryFeePerSlot = input.isDelivery && delivery !== null ? delivery.feePerSlot : 0;

    const total = computeOrderTotal({
        pricePerPortion: pkg.basePrice,
        slotCount: schedules.length,
        deliveryFeePerSlot,
        tier,
        promo: promoResult?.valid ? promoResult.promoCode : null,
    });
    const startDate = Temporal.PlainDate.from(first.date);
    const endDate = Temporal.PlainDate.from(last.date);

    const preview: CheckoutPreview = {
        slots: schedules.map((schedule, index) => {
            const menu = slotMenus[index]!;
            return {
                menuScheduleId: schedule.id,
                date: schedule.date,
                deliveryTime: schedule.deliveryTime,
                menu,
                hasAlternative: schedule.alternativeMenuId !== null,
                clashingAllergies: findClashingAllergies(allergyIds, menu.allergies ?? []),
            };
        }),
        slotCount: schedules.length,
        startDate: first.date,
        endDate: last.date,
        cutoffAt: cutoffAt(startDate).toString({ timeZoneName: "never", fractionalSecondDigits: 3 }),
        delivery: {
            available: delivery?.available ?? false,
            distanceKm: delivery?.distanceKm ?? null,
            maxDistanceKm: rates.maxDistanceKm,
            feePerSlot: deliveryFeePerSlot,
        },
        promo: toPromoCheck(promoResult, total.promoApplied),
        pricePerPortion: total.pricePerPortion,
        foodSubtotal: total.foodSubtotal,
        tierDiscount: total.tierDiscount,
        promoDiscount: total.promoDiscount,
        deliveryFeePerSlot: total.deliveryFeePerSlot,
        deliveryFeeTotal: total.deliveryFeeTotal,
        totalPrice: total.totalPrice,
    };

    return {
        preview,
        package: pkg,
        schedules,
        total,
        promoCodeId: promoResult?.valid && total.promoApplied ? promoResult.promoCode.id : null,
        promoQuota: promoResult?.valid && total.promoApplied ? promoResult.promoCode.quota : null,
        delivery,
        startDate,
        endDate,
        paymentTimeoutMinutes: settings.paymentTimeoutMinutes,
    };
}

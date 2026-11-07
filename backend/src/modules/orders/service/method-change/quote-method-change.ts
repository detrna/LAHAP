import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import type { DeliveryMethodDeliveryQuote } from "../../domain/delivery-method-change.domain.js";
import { quoteDelivery, resolveDeliveryRates } from "../../domain/delivery-fee.js";
import { planMethodSwitch, quoteDowngrade, quoteUpgrade, type SwitchQuote } from "../../domain/method-change.js";
import type { OrderRecord, SubscriptionRecord } from "../interfaces/orders.repository.js";
import { SubscriptionNotFoundError } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";
import type { MethodChangeActor, MethodChangeInput } from "./method-change-input.js";

export interface MethodChangeQuote {
    readonly subscription: SubscriptionRecord;
    readonly effectiveFrom: Temporal.PlainDate;
    readonly slots: readonly OrderRecord[];
    readonly quote: SwitchQuote;
    readonly delivery: DeliveryMethodDeliveryQuote | null;
    readonly paymentTimeoutMinutes: number;
}

async function quoteDeliveryFee(
    service: OrdersService,
    subscription: SubscriptionRecord,
    input: MethodChangeInput,
): Promise<{ readonly delivery: DeliveryMethodDeliveryQuote; readonly paymentTimeoutMinutes: number }> {
    if (input.deliveryLatitude === null || input.deliveryLongitude === null) {
        throw new InvalidStateError("delivery needs a delivery point");
    }
    const [settings, [pkg]] = await Promise.all([
        service.settings.getSettings(),
        service.catalog.getPackagesByIds([subscription.packageId]),
    ]);
    if (pkg === undefined) throw new InvalidStateError("package is not available");
    const rates = resolveDeliveryRates(pkg, settings);
    const quoted = quoteDelivery(
        { lat: settings.latitude, lng: settings.longitude },
        { lat: input.deliveryLatitude, lng: input.deliveryLongitude },
        rates,
    );
    return {
        delivery: {
            available: quoted.available,
            distanceKm: quoted.distanceKm,
            maxDistanceKm: rates.maxDistanceKm,
            feePerSlot: quoted.feePerSlot,
        },
        paymentTimeoutMinutes: settings.paymentTimeoutMinutes,
    };
}

export async function quoteMethodChange(
    this: OrdersService,
    actor: MethodChangeActor,
    subscriptionId: string,
    input: MethodChangeInput,
): Promise<MethodChangeQuote> {
    const subscription = await this.ordersRepository.findSubscriptionById(subscriptionId);
    if (subscription === null || (!actor.asAdmin && subscription.userId !== actor.userId)) {
        throw new SubscriptionNotFoundError();
    }
    if (subscription.status !== "Success") throw new InvalidStateError("subscription is not paid");

    const orders = await this.ordersRepository.findOrdersBySubscriptionId(subscriptionId);
    const plan = planMethodSwitch({
        orders,
        toDelivery: input.isDelivery,
        today: this.clock.now().toPlainDate(),
        endDate: subscription.endDate,
        requested: input.effectiveFrom,
    });

    if (!input.isDelivery) {
        return {
            subscription,
            effectiveFrom: plan.effectiveFrom,
            slots: plan.slots,
            quote: quoteDowngrade(plan.slots),
            delivery: null,
            paymentTimeoutMinutes: 0,
        };
    }
    const { delivery, paymentTimeoutMinutes } = await quoteDeliveryFee(this, subscription, input);
    return {
        subscription,
        effectiveFrom: plan.effectiveFrom,
        slots: plan.slots,
        quote: quoteUpgrade(plan.slots, delivery.feePerSlot),
        delivery,
        paymentTimeoutMinutes,
    };
}

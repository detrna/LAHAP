import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import type { PaymentTransactionResult } from "../../../../shared/ports/payment-gateway/payment-gateway.js";
import { toDbTimestamp, toIsoTimestamp } from "../../../../shared/time/timestamp.js";
import type { CheckoutResult } from "../../domain/checkout.domain.js";
import type { PaymentMethod, PaymentSession } from "../../domain/payment.domain.js";
import { PROMO_CUSTOMER_USE_STATUSES, PROMO_USE_STATUSES } from "../../domain/promo-usage.js";
import type { OrdersService } from "../orders.service.js";
import { toPayment, toSubscription } from "../present.js";
import type { CheckoutInput } from "./checkout-input.js";

export async function createSubscription(
    this: OrdersService,
    userId: string,
    input: CheckoutInput,
): Promise<CheckoutResult> {
    if (input.purchaseType === "Online" && input.paymentMethod === "CASH") {
        throw new InvalidStateError("online orders cannot be paid in cash");
    }
    const quote = await this.quoteCheckout(userId, input);
    if (input.isDelivery && quote.delivery?.available !== true) {
        throw new InvalidStateError("delivery is not available for this address");
    }

    const { total, paymentTimeoutMinutes } = quote;
    const isFree = total.totalPrice === 0;
    const method: PaymentMethod = isFree ? "FREE" : input.paymentMethod;
    const subscriptionId = this.generateId();
    const paymentId = this.generateId();

    let transaction: PaymentTransactionResult | null = null;
    if (method === "MIDTRANS") {
        transaction = await this.paymentGateway.createTransaction({
            orderId: paymentId,
            grossAmount: total.totalPrice,
            expiryMinutes: paymentTimeoutMinutes,
        });
    }

    const now = toDbTimestamp(this.clock.now());
    const record = await this.ordersRepository.createCheckout({
        subscription: {
            id: subscriptionId,
            userId,
            packageId: quote.package.id,
            promoCodeId: quote.promoCodeId,
            tierId: total.tierId,
            status: isFree ? "Success" : "Pending",
            purchaseType: input.purchaseType,
            period: input.period,
            startDate: quote.startDate,
            endDate: quote.endDate,
            isDelivery: input.isDelivery,
            recipientName: input.recipientName,
            deliveryAddress: input.isDelivery ? input.deliveryAddress : null,
            deliveryLatitude: input.isDelivery ? input.deliveryLatitude : null,
            deliveryLongitude: input.isDelivery ? input.deliveryLongitude : null,
            deliveryDistanceKm: input.isDelivery ? (quote.delivery?.distanceKm ?? null) : null,
            notes: input.notes,
            pricePerPortion: total.pricePerPortion,
            foodSubtotal: total.foodSubtotal,
            tierDiscount: total.tierDiscount,
            promoDiscount: total.promoDiscount,
            deliveryFeePerSlot: total.deliveryFeePerSlot,
            deliveryFeeTotal: total.deliveryFeeTotal,
            totalPrice: total.totalPrice,
        },
        slots: quote.schedules.map(schedule => ({
            id: this.generateId(),
            menuScheduleId: schedule.id,
            serviceDate: Temporal.PlainDate.from(schedule.date),
        })),
        payment: {
            id: paymentId,
            method,
            amount: total.totalPrice,
            status: isFree ? "Success" : "Pending",
            paidAt: isFree ? now : null,
        },
        promo:
            quote.promoCodeId === null || quote.promoQuota === null
                ? null
                : {
                      promoCodeId: quote.promoCodeId,
                      quota: quote.promoQuota,
                      useStatuses: PROMO_USE_STATUSES,
                      customerUseStatuses: PROMO_CUSTOMER_USE_STATUSES,
                  },
    });

    let paymentSession: PaymentSession | null = null;
    if (transaction !== null) {
        paymentSession = {
            snapToken: transaction.token,
            redirectUrl: transaction.redirectUrl,
            expiresAt: toIsoTimestamp(record.payment.createdAt.add({ minutes: paymentTimeoutMinutes })),
        };
        await this.storePaymentSession(paymentId, paymentSession, paymentTimeoutMinutes);
    }
    if (isFree) await this.afterSubscriptionPaid(record.subscription);

    return {
        subscription: toSubscription(record.subscription, this.clock.now().toPlainDate()),
        payment: toPayment(record.payment),
        paymentSession,
    };
}

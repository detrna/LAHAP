import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import type { PaymentTransactionResult } from "../../../../shared/ports/payment-gateway/payment-gateway.js";
import { toIsoTimestamp } from "../../../../shared/time/timestamp.js";
import type { DeliveryMethodChangeResult } from "../../domain/delivery-method-change.domain.js";
import type { PaymentSession } from "../../domain/payment.domain.js";
import type { NewPaymentRecord } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";
import { toDeliveryMethodChange, toPayment } from "../present.js";
import type { MethodChangeActor, MethodChangeInput } from "./method-change-input.js";

export async function changeDeliveryMethod(
    this: OrdersService,
    actor: MethodChangeActor,
    subscriptionId: string,
    input: MethodChangeInput,
): Promise<DeliveryMethodChangeResult> {
    const { subscription, effectiveFrom, quote, delivery, paymentTimeoutMinutes } = await this.quoteMethodChange(
        actor,
        subscriptionId,
        input,
    );
    if (input.isDelivery && delivery?.available !== true) {
        throw new InvalidStateError("delivery is not available for this address");
    }
    const charges = input.isDelivery && quote.amount > 0;
    if (charges && input.paymentMethod === "CASH" && subscription.purchaseType === "Online") {
        throw new InvalidStateError("online orders cannot be paid in cash");
    }

    const paymentId = charges ? this.generateId() : null;
    let transaction: PaymentTransactionResult | null = null;
    if (paymentId !== null && input.paymentMethod === "MIDTRANS") {
        transaction = await this.paymentGateway.createTransaction({
            orderId: paymentId,
            grossAmount: quote.amount,
            expiryMinutes: paymentTimeoutMinutes,
        });
    }
    const payment: NewPaymentRecord | null =
        paymentId === null
            ? null
            : { id: paymentId, method: input.paymentMethod, amount: quote.amount, status: "Pending", paidAt: null };

    const result = await this.ordersRepository.createMethodChange({
        change: {
            id: this.generateId(),
            subscriptionId,
            requestedById: actor.userId,
            toDelivery: input.isDelivery,
            effectiveFrom,
            status: charges ? "Pending" : "Success",
            slotCount: quote.slots.length,
            deliveryFeePerSlot: quote.deliveryFeePerSlot,
            amount: quote.amount,
            needsRefund: !input.isDelivery && quote.amount > 0,
            deliveryAddress: input.isDelivery ? input.deliveryAddress : null,
            deliveryLatitude: input.isDelivery ? input.deliveryLatitude : null,
            deliveryLongitude: input.isDelivery ? input.deliveryLongitude : null,
            deliveryDistanceKm: input.isDelivery ? (delivery?.distanceKm ?? null) : null,
        },
        slots: quote.slots,
        payment,
        apply: !charges,
    });

    let paymentSession: PaymentSession | null = null;
    if (transaction !== null && result.payment !== null) {
        paymentSession = {
            snapToken: transaction.token,
            redirectUrl: transaction.redirectUrl,
            expiresAt: toIsoTimestamp(result.payment.createdAt.add({ minutes: paymentTimeoutMinutes })),
        };
        await this.storePaymentSession(result.payment.id, paymentSession, paymentTimeoutMinutes);
    }
    if (!charges) await this.afterMethodChanged(result.change, result.subscription, result.slotsBefore);

    return {
        change: toDeliveryMethodChange(result.change),
        payment: result.payment === null ? null : toPayment(result.payment),
        paymentSession,
    };
}

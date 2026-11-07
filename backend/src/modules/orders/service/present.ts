import { toIsoTimestamp } from "../../../shared/time/timestamp.js";
import type { Order } from "../domain/order.domain.js";
import type { Payment } from "../domain/payment.domain.js";
import { isDoneOnline } from "../domain/payment-status.js";
import type { Subscription } from "../domain/subscription.domain.js";
import { toDisplayStatus } from "../domain/display-status.js";
import type { DeliveryMethodChange } from "../domain/delivery-method-change.domain.js";
import type {
    DeliveryMethodChangeRecord,
    OrderRecord,
    PaymentRecord,
    SubscriptionRecord,
} from "./interfaces/orders.repository.js";

export function toDeliveryMethodChange(record: DeliveryMethodChangeRecord): DeliveryMethodChange {
    return {
        id: record.id,
        subscriptionId: record.subscriptionId,
        requestedById: record.requestedById,
        toDelivery: record.toDelivery,
        effectiveFrom: record.effectiveFrom.toString(),
        status: record.status,
        slotCount: record.slotCount,
        deliveryFeePerSlot: record.deliveryFeePerSlot,
        amount: record.amount,
        needsRefund: record.needsRefund,
        refundedAt: record.refundedAt === null ? null : toIsoTimestamp(record.refundedAt),
        paymentId: record.paymentId,
        deliveryAddress: record.deliveryAddress,
        deliveryLatitude: record.deliveryLatitude,
        deliveryLongitude: record.deliveryLongitude,
        deliveryDistanceKm: record.deliveryDistanceKm,
        slots: record.slots.map(slot => ({
            orderId: slot.orderId,
            serviceDate: slot.serviceDate.toString(),
            fee: slot.fee,
        })),
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
    };
}

export function toSubscription(record: SubscriptionRecord, today: Temporal.PlainDate): Subscription {
    return {
        id: record.id,
        userId: record.userId,
        packageId: record.packageId,
        promoCodeId: record.promoCodeId,
        tierId: record.tierId,
        status: record.status,
        displayStatus: toDisplayStatus(record, today),
        purchaseType: record.purchaseType,
        period: record.period,
        startDate: record.startDate.toString(),
        endDate: record.endDate.toString(),
        isDelivery: record.isDelivery,
        recipientName: record.recipientName,
        deliveryAddress: record.deliveryAddress,
        deliveryLatitude: record.deliveryLatitude,
        deliveryLongitude: record.deliveryLongitude,
        deliveryDistanceKm: record.deliveryDistanceKm,
        notes: record.notes,
        pricePerPortion: record.pricePerPortion,
        foodSubtotal: record.foodSubtotal,
        tierDiscount: record.tierDiscount,
        promoDiscount: record.promoDiscount,
        deliveryFeePerSlot: record.deliveryFeePerSlot,
        deliveryFeeTotal: record.deliveryFeeTotal,
        totalPrice: record.totalPrice,
        needsRefund: record.needsRefund,
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
    };
}

export function toPayment(record: PaymentRecord): Payment {
    return {
        id: record.id,
        subscriptionId: record.subscriptionId,
        userId: record.userId,
        method: record.method,
        doneOnline: isDoneOnline(record.method),
        type: record.type,
        amount: record.amount,
        status: record.status,
        transactionId: record.transactionId,
        paidAt: record.paidAt === null ? null : toIsoTimestamp(record.paidAt),
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
    };
}

export function toOrder(record: OrderRecord, completedAt: Temporal.PlainDateTime | null = null): Order {
    return {
        id: record.id,
        subscriptionId: record.subscriptionId,
        menuScheduleId: record.menuScheduleId,
        courierId: record.courierId,
        status: record.status,
        usesAlternativeMenu: record.usesAlternativeMenu,
        skipReason: record.skipReason,
        isDelivery: record.isDelivery,
        deliveryFee: record.deliveryFee,
        completedAt: completedAt === null ? null : toIsoTimestamp(completedAt),
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
    };
}

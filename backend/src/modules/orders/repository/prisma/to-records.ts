import { fromNumeric, fromNumericOrNull } from "../../../../infrastructure/database/prisma/numeric.js";
import type { OrderPeriod } from "../../../catalog/domain/package.domain.js";
import type { OrderStatus } from "../../domain/order.domain.js";
import type { PaymentMethod, PaymentStatus, PaymentType } from "../../domain/payment.domain.js";
import type { PurchaseType, SubscriptionStatus } from "../../domain/subscription.domain.js";
import type { OrderRecord, PaymentRecord, SubscriptionRecord } from "../../service/interfaces/orders.repository.js";

export interface SubscriptionRow {
    readonly id: string;
    readonly userId: string;
    readonly packageId: string;
    readonly promoCodeId: string | null;
    readonly tierId: string | null;
    readonly status: string;
    readonly purchaseType: string;
    readonly period: string;
    readonly startDate: Temporal.PlainDate;
    readonly endDate: Temporal.PlainDate;
    readonly isDelivery: boolean;
    readonly recipientName: string;
    readonly deliveryAddress: string | null;
    readonly deliveryLatitude: string | null;
    readonly deliveryLongitude: string | null;
    readonly deliveryDistanceKm: number | null;
    readonly notes: string | null;
    readonly pricePerPortion: string;
    readonly foodSubtotal: string;
    readonly tierDiscount: string;
    readonly promoDiscount: string;
    readonly deliveryFeePerSlot: string;
    readonly deliveryFeeTotal: string;
    readonly totalPrice: string;
    readonly needsRefund: boolean;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface PaymentRow {
    readonly id: string;
    readonly subscriptionId: string;
    readonly userId: string;
    readonly method: string;
    readonly type: string;
    readonly amount: string;
    readonly status: string;
    readonly transactionId: string | null;
    readonly paidAt: Temporal.PlainDateTime | null;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface OrderRow {
    readonly id: string;
    readonly subscriptionId: string;
    readonly menuScheduleId: string;
    readonly serviceDate: Temporal.PlainDate;
    readonly courierId: string | null;
    readonly status: string;
    readonly usesAlternativeMenu: boolean;
    readonly skipReason: string | null;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export function toSubscriptionRecord(row: SubscriptionRow): SubscriptionRecord {
    return {
        id: row.id,
        userId: row.userId,
        packageId: row.packageId,
        promoCodeId: row.promoCodeId,
        tierId: row.tierId,
        status: row.status as SubscriptionStatus,
        purchaseType: row.purchaseType as PurchaseType,
        period: row.period as OrderPeriod,
        startDate: row.startDate,
        endDate: row.endDate,
        isDelivery: row.isDelivery,
        recipientName: row.recipientName,
        deliveryAddress: row.deliveryAddress,
        deliveryLatitude: fromNumericOrNull(row.deliveryLatitude),
        deliveryLongitude: fromNumericOrNull(row.deliveryLongitude),
        deliveryDistanceKm: row.deliveryDistanceKm,
        notes: row.notes,
        pricePerPortion: fromNumeric(row.pricePerPortion),
        foodSubtotal: fromNumeric(row.foodSubtotal),
        tierDiscount: fromNumeric(row.tierDiscount),
        promoDiscount: fromNumeric(row.promoDiscount),
        deliveryFeePerSlot: fromNumeric(row.deliveryFeePerSlot),
        deliveryFeeTotal: fromNumeric(row.deliveryFeeTotal),
        totalPrice: fromNumeric(row.totalPrice),
        needsRefund: row.needsRefund,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export function toPaymentRecord(row: PaymentRow): PaymentRecord {
    return {
        id: row.id,
        subscriptionId: row.subscriptionId,
        userId: row.userId,
        method: row.method as PaymentMethod,
        type: row.type as PaymentType,
        amount: fromNumeric(row.amount),
        status: row.status as PaymentStatus,
        transactionId: row.transactionId,
        paidAt: row.paidAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export function toOrderRecord(row: OrderRow): OrderRecord {
    return {
        id: row.id,
        subscriptionId: row.subscriptionId,
        menuScheduleId: row.menuScheduleId,
        serviceDate: row.serviceDate,
        courierId: row.courierId,
        status: row.status as OrderStatus,
        usesAlternativeMenu: row.usesAlternativeMenu,
        skipReason: row.skipReason,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

import type { Payment, PaymentSession } from "./payment.domain.js";

export const DELIVERY_METHOD_CHANGE_STATUSES = ["Pending", "Success", "Expire"] as const;
export type DeliveryMethodChangeStatus = (typeof DELIVERY_METHOD_CHANGE_STATUSES)[number];

export interface DeliveryMethodChangeSlot {
    readonly orderId: string;
    readonly serviceDate: string;
    readonly fee: number;
}

export interface DeliveryMethodChange {
    readonly id: string;
    readonly subscriptionId: string;
    readonly requestedById: string;
    readonly toDelivery: boolean;
    readonly effectiveFrom: string;
    readonly status: DeliveryMethodChangeStatus;
    readonly slotCount: number;
    readonly deliveryFeePerSlot: number;
    readonly amount: number;
    readonly needsRefund: boolean;
    readonly refundedAt: string | null;
    readonly paymentId: string | null;
    readonly deliveryAddress: string | null;
    readonly deliveryLatitude: number | null;
    readonly deliveryLongitude: number | null;
    readonly deliveryDistanceKm: number | null;
    readonly slots: readonly DeliveryMethodChangeSlot[];
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface DeliveryMethodDeliveryQuote {
    readonly available: boolean;
    readonly distanceKm: number;
    readonly maxDistanceKm: number;
    readonly feePerSlot: number;
}

export interface DeliveryMethodPreview {
    readonly toDelivery: boolean;
    readonly effectiveFrom: string;
    readonly slots: readonly DeliveryMethodChangeSlot[];
    readonly slotCount: number;
    readonly deliveryFeePerSlot: number;
    readonly amount: number;
    readonly delivery: DeliveryMethodDeliveryQuote | null;
}

export interface DeliveryMethodChangeResult {
    readonly change: DeliveryMethodChange;
    readonly payment: Payment | null;
    readonly paymentSession: PaymentSession | null;
}

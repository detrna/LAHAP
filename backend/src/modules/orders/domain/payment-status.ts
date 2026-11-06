import type { PaymentStatus as GatewayPaymentStatus } from "../../../shared/ports/payment-gateway/payment-gateway.js";
import type { PaymentMethod, PaymentStatus } from "./payment.domain.js";

const STORED_STATUS: Readonly<Record<GatewayPaymentStatus, PaymentStatus>> = {
    PAID: "Success",
    PENDING: "Pending",
    CHALLENGE: "Pending",
    FAILED: "Expire",
    EXPIRED: "Expire",
    CANCELED: "Expire",
    REFUNDED: "Refund",
};

export function toStoredPaymentStatus(status: GatewayPaymentStatus): PaymentStatus {
    return STORED_STATUS[status];
}

export function toPaidMethod(paymentType: string | undefined): PaymentMethod {
    const channel = paymentType
        ?.trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_");
    return channel ? `MIDTRANS_${channel}` : "MIDTRANS";
}

export function isDoneOnline(method: PaymentMethod): boolean {
    return method !== "CASH";
}

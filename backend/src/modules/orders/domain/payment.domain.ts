export type PaymentMethod = "CASH" | "MIDTRANS" | `MIDTRANS_${string}`;

export const PAYMENT_TYPES = ["SUBSCRIPTION", "DELIVERY_SERVICE_UPGRADE"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_STATUSES = ["Pending", "Success", "Expire", "Refund"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface Payment {
    readonly id: string;
    readonly subscriptionId: string;
    readonly userId: string;
    readonly method: PaymentMethod;
    readonly doneOnline: boolean;
    readonly type: PaymentType;
    readonly amount: number;
    readonly status: PaymentStatus;
    readonly transactionId: string | null;
    readonly paidAt: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface PaymentSession {
    readonly snapToken: string;
    readonly redirectUrl: string;
    readonly expiresAt: string;
}

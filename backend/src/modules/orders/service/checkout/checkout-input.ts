import type { RangePeriod } from "../../domain/period-slots.js";
import type { PurchaseType } from "../../domain/subscription.domain.js";

export type CheckoutSelection =
    | { readonly period: "Harian"; readonly menuScheduleIds: readonly string[] }
    | {
          readonly period: RangePeriod;
          readonly periodStart: Temporal.PlainDate;
          readonly deliveryTimes: readonly Temporal.PlainTime[];
      };

export type CheckoutInput = CheckoutSelection & {
    readonly packageId: string;
    readonly purchaseType: PurchaseType;
    readonly isDelivery: boolean;
    readonly recipientName: string;
    readonly deliveryAddress: string | null;
    readonly deliveryLatitude: number | null;
    readonly deliveryLongitude: number | null;
    readonly notes: string | null;
    readonly promoCode: string | null;
    readonly paymentMethod: "MIDTRANS" | "CASH";
};

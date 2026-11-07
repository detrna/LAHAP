import { z } from "zod";
import { paginationQuerySchema } from "../../../shared/pagination/index.js";
import { latitudeSchema, longitudeSchema } from "../../../shared/schema/coordinates.js";
import { queryBooleanSchema } from "../../../shared/schema/query-boolean.js";
import { uniqueArray } from "../../../shared/schema/unique-array.js";
import { isoDateSchema } from "../../../shared/time/schemas.js";
import { clockTimeSchema } from "../../../shared/utils/meal-time/meal-time.js";
import { ORDER_STATUSES } from "../domain/order.domain.js";
import { REPORT_PERIODS } from "../domain/report-period.js";
import { PAYMENT_STATUSES, PAYMENT_TYPES } from "../domain/payment.domain.js";
import { PURCHASE_TYPES, SUBSCRIPTION_STATUSES } from "../domain/subscription.domain.js";

export const RECIPIENT_NAME_MAX_LENGTH = 100;
export const NOTES_MAX_LENGTH = 500;
export const PROMO_CODE_MAX_LENGTH = 50;
export const MAX_CHOSEN_SLOTS = 100;
export const MAX_BULK_SLOTS = 500;
export const SKIP_REASON_MAX_LENGTH = 500;
export const ADMIN_NOTE_MAX_LENGTH = 500;
export const ASSIGNMENT_MAX_DAYS = 31;
export const CHECKOUT_PAYMENT_METHODS = ["MIDTRANS", "CASH"] as const;

export const subscriptionIdParamsSchema = z.object({
    id: z.uuid(),
});

export const orderIdParamsSchema = z.object({
    id: z.uuid(),
});

export const paymentIdParamsSchema = z.object({
    id: z.uuid(),
});

const optionalText = (maxLength?: number) => {
    const text = z.string().trim();
    return (maxLength === undefined ? text : text.max(maxLength)).nullish().transform(value => value || null);
};

const checkoutFields = {
    packageId: z.uuid(),
    purchaseType: z.enum(PURCHASE_TYPES),
    isDelivery: z.boolean(),
    recipientName: z.string().trim().min(1).max(RECIPIENT_NAME_MAX_LENGTH),
    deliveryAddress: optionalText(),
    deliveryLatitude: latitudeSchema.nullish().transform(value => value ?? null),
    deliveryLongitude: longitudeSchema.nullish().transform(value => value ?? null),
    notes: optionalText(NOTES_MAX_LENGTH),
    promoCode: optionalText(PROMO_CODE_MAX_LENGTH),
    paymentMethod: z.enum(CHECKOUT_PAYMENT_METHODS).default("MIDTRANS"),
};

const dailyCheckoutSchema = z.object({
    ...checkoutFields,
    period: z.literal("Harian"),
    menuScheduleIds: uniqueArray(z.uuid()).min(1).max(MAX_CHOSEN_SLOTS),
});

const rangeCheckoutSchema = z.object({
    ...checkoutFields,
    period: z.enum(["Mingguan", "Bulanan"]),
    periodStart: isoDateSchema,
    deliveryTimes: uniqueArray(clockTimeSchema, { by: time => time.toString() }).min(1),
});

interface DeliveryPointFields {
    readonly isDelivery: boolean;
    readonly deliveryAddress: string | null;
    readonly deliveryLatitude: number | null;
    readonly deliveryLongitude: number | null;
}

function refineDeliveryPoint(value: DeliveryPointFields, ctx: z.RefinementCtx): void {
    const hasLatitude = value.deliveryLatitude !== null;
    const hasLongitude = value.deliveryLongitude !== null;
    if (hasLatitude !== hasLongitude) {
        ctx.addIssue({
            code: "custom",
            path: [hasLatitude ? "deliveryLongitude" : "deliveryLatitude"],
            message: "deliveryLatitude and deliveryLongitude must be sent together",
        });
    }
    if (!value.isDelivery) return;
    if (value.deliveryAddress === null) {
        ctx.addIssue({ code: "custom", path: ["deliveryAddress"], message: "is required for delivery" });
    }
    if (!hasLatitude && !hasLongitude) {
        ctx.addIssue({ code: "custom", path: ["deliveryLatitude"], message: "is required for delivery" });
    }
}

export const checkoutSchema = z
    .discriminatedUnion("period", [dailyCheckoutSchema, rangeCheckoutSchema])
    .superRefine(refineDeliveryPoint);

export type CheckoutBody = z.output<typeof checkoutSchema>;

export const deliveryMethodChangeSchema = z
    .object({
        isDelivery: z.boolean(),
        effectiveFrom: isoDateSchema.optional(),
        deliveryAddress: optionalText(),
        deliveryLatitude: latitudeSchema.nullish().transform(value => value ?? null),
        deliveryLongitude: longitudeSchema.nullish().transform(value => value ?? null),
        paymentMethod: z.enum(CHECKOUT_PAYMENT_METHODS).default("MIDTRANS"),
    })
    .superRefine(refineDeliveryPoint);

export type DeliveryMethodChangeBody = z.output<typeof deliveryMethodChangeSchema>;

export const methodChangeIdParamsSchema = z.object({
    id: z.uuid(),
});

export const adminMethodChangeListQuerySchema = paginationQuerySchema.extend({
    needsRefund: queryBooleanSchema.optional(),
});

export type AdminMethodChangeListQuery = z.output<typeof adminMethodChangeListQuerySchema>;

export const subscriptionListQuerySchema = paginationQuerySchema.extend({
    status: z.enum(SUBSCRIPTION_STATUSES).optional(),
});

export const paymentListQuerySchema = paginationQuerySchema;

export const slotDateQuerySchema = z.object({
    date: isoDateSchema.optional(),
});

export const skipSchema = z.object({
    skipReason: optionalText(SKIP_REASON_MAX_LENGTH),
});

export const skipDaySchema = z.object({
    date: isoDateSchema,
    subscriptionId: z.uuid().optional(),
    skipReason: optionalText(SKIP_REASON_MAX_LENGTH),
});

export type SubscriptionListQuery = z.output<typeof subscriptionListQuerySchema>;
export type SlotDateQuery = z.output<typeof slotDateQuerySchema>;
export type SkipBody = z.output<typeof skipSchema>;
export type SkipDayBody = z.output<typeof skipDaySchema>;

export const foodReadySchema = z.union([
    z.strictObject({ menuScheduleId: z.uuid(), usesAlternativeMenu: z.boolean().optional() }),
    z.strictObject({ orderIds: uniqueArray(z.uuid()).min(1).max(MAX_BULK_SLOTS) }),
]);

export type FoodReadyBody = z.output<typeof foodReadySchema>;

export const statusCorrectionSchema = z.object({
    status: z.enum(ORDER_STATUSES),
    adminNote: z.string().trim().min(1).max(ADMIN_NOTE_MAX_LENGTH),
});

export const courierAssignmentQuerySchema = z.object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
});

const courierIdSchema = z.uuid().nullable();

export const courierAssignmentSchema = z.union([
    z.strictObject({ courierId: courierIdSchema, orderIds: uniqueArray(z.uuid()).min(1).max(MAX_BULK_SLOTS) }),
    z.strictObject({
        courierId: courierIdSchema,
        date: isoDateSchema,
        deliveryTime: clockTimeSchema,
        packageId: z.uuid().optional(),
    }),
]);

export type StatusCorrectionBody = z.output<typeof statusCorrectionSchema>;
export type CourierAssignmentQuery = z.output<typeof courierAssignmentQuerySchema>;
export type CourierAssignmentBody = z.output<typeof courierAssignmentSchema>;

const createdRangeQuery = {
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
};

const refineCreatedRange = (
    value: { from?: Temporal.PlainDate | undefined; to?: Temporal.PlainDate | undefined },
    ctx: z.RefinementCtx,
) => {
    if (value.from !== undefined && value.to !== undefined && Temporal.PlainDate.compare(value.to, value.from) < 0) {
        ctx.addIssue({ code: "custom", path: ["to"], message: "must not be before from" });
    }
};

export const adminSubscriptionListQuerySchema = paginationQuerySchema
    .extend({
        status: z.enum(SUBSCRIPTION_STATUSES).optional(),
        userId: z.uuid().optional(),
        packageId: z.uuid().optional(),
        purchaseType: z.enum(PURCHASE_TYPES).optional(),
        needsRefund: queryBooleanSchema.optional(),
        ...createdRangeQuery,
    })
    .superRefine(refineCreatedRange);

export const adminPaymentListQuerySchema = paginationQuerySchema
    .extend({
        status: z.enum(PAYMENT_STATUSES).optional(),
        type: z.enum(PAYMENT_TYPES).optional(),
        method: z
            .string()
            .regex(/^(CASH|FREE|MIDTRANS(_[A-Z0-9_]+)?)$/)
            .optional(),
        userId: z.uuid().optional(),
        needsRefund: queryBooleanSchema.optional(),
        ...createdRangeQuery,
    })
    .superRefine(refineCreatedRange);

export const adminSlotListQuerySchema = paginationQuerySchema.extend({
    date: isoDateSchema.optional(),
    deliveryTime: clockTimeSchema.optional(),
    status: z.enum(ORDER_STATUSES).optional(),
    isDelivery: queryBooleanSchema.optional(),
    courierId: z.uuid().optional(),
    unassigned: queryBooleanSchema.optional(),
    packageId: z.uuid().optional(),
    subscriptionId: z.uuid().optional(),
});

export type AdminSubscriptionListQuery = z.output<typeof adminSubscriptionListQuerySchema>;
export type AdminPaymentListQuery = z.output<typeof adminPaymentListQuerySchema>;
export type AdminSlotListQuery = z.output<typeof adminSlotListQuerySchema>;

export const reportPeriodQuerySchema = z.object({
    period: z.enum(REPORT_PERIODS).default("today"),
});

export type ReportPeriodQuery = z.output<typeof reportPeriodQuerySchema>;

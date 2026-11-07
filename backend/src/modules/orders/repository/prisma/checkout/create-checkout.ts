import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { toNumeric, toNumericOrNull } from "../../../../../infrastructure/database/prisma/numeric.js";
import { getForeignKeyViolationConstraint } from "../../../../../infrastructure/database/prisma/sql-errors.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { InvalidStateError } from "../../../../../shared/errors/invalid-state-error.js";
import type { CheckoutRecord, CheckoutWrite } from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { toOrderRecord, toPaymentRecord, toSubscriptionRecord } from "../to-records.js";

const MONEY_SCALE = 2;
const COORDINATE_SCALE = 8;
const FOREIGN_KEY_MESSAGES: Readonly<Record<string, string>> = {
    subscription_promo_code_id_fkey: "promo code no longer exists",
    subscription_package_id_fkey: "package is not available",
    subscription_tier_id_fkey: "tier no longer exists",
    order_menu_schedule_id_fkey: "slot is not available",
};

function toCheckoutWriteError(cause: unknown): AppError | null {
    if (cause instanceof AppError) return cause;
    const constraint = getForeignKeyViolationConstraint(cause);
    const message = constraint === null ? undefined : FOREIGN_KEY_MESSAGES[constraint];
    return message === undefined ? null : new InvalidStateError(message, { cause });
}

export async function createCheckout(this: PrismaOrdersRepository, write: CheckoutWrite): Promise<CheckoutRecord> {
    const { subscription, slots, payment, promo } = write;
    try {
        return await this.db.transaction(async tx => {
            if (promo !== null) {
                await tx.execute(
                    tx.raw.sql`SELECT pg_advisory_xact_lock(hashtext(${`promo-code:${promo.promoCodeId}`}))`
                        .affectedCount()
                        .build(),
                );
                const used = await tx.orm.public.Subscription.where({ promoCodeId: promo.promoCodeId })
                    .where(row => row.status.in([...promo.useStatuses] as Varchar<30>[]))
                    .aggregate(aggregate => ({ count: aggregate.count() }));
                if (used.count >= promo.quota) throw new InvalidStateError("promo code quota is exhausted");
                const own = await tx.orm.public.Subscription.where({
                    promoCodeId: promo.promoCodeId,
                    userId: subscription.userId,
                })
                    .where(row => row.status.in([...promo.customerUseStatuses] as Varchar<30>[]))
                    .aggregate(aggregate => ({ count: aggregate.count() }));
                if (own.count > 0) throw new InvalidStateError("promo code has already been used");
            }

            const createdSubscription = await tx.orm.public.Subscription.create({
                id: subscription.id,
                userId: subscription.userId,
                packageId: subscription.packageId,
                promoCodeId: subscription.promoCodeId,
                tierId: subscription.tierId,
                status: subscription.status,
                purchaseType: subscription.purchaseType,
                period: subscription.period,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                isDelivery: subscription.isDelivery,
                recipientName: subscription.recipientName,
                deliveryAddress: subscription.deliveryAddress,
                deliveryLatitude: toNumericOrNull(subscription.deliveryLatitude, COORDINATE_SCALE),
                deliveryLongitude: toNumericOrNull(subscription.deliveryLongitude, COORDINATE_SCALE),
                deliveryDistanceKm: subscription.deliveryDistanceKm,
                notes: subscription.notes,
                pricePerPortion: toNumeric(subscription.pricePerPortion, MONEY_SCALE),
                foodSubtotal: toNumeric(subscription.foodSubtotal, MONEY_SCALE),
                tierDiscount: toNumeric(subscription.tierDiscount, MONEY_SCALE),
                promoDiscount: toNumeric(subscription.promoDiscount, MONEY_SCALE),
                deliveryFeePerSlot: toNumeric(subscription.deliveryFeePerSlot, MONEY_SCALE),
                deliveryFeeTotal: toNumeric(subscription.deliveryFeeTotal, MONEY_SCALE),
                totalPrice: toNumeric(subscription.totalPrice, MONEY_SCALE),
            });

            await tx.orm.public.Order.createAll(
                slots.map(slot => ({
                    id: slot.id,
                    subscriptionId: subscription.id,
                    menuScheduleId: slot.menuScheduleId,
                    serviceDate: slot.serviceDate,
                    status: "Terjadwal",
                    isDelivery: slot.isDelivery,
                    deliveryFee: toNumeric(slot.deliveryFee, MONEY_SCALE),
                })),
            );
            await tx.orm.public.OrderStatusHistory.createAll(
                slots.map(slot => ({
                    orderId: slot.id,
                    changedById: subscription.userId,
                    fromStatus: null,
                    toStatus: "Terjadwal",
                })),
            );

            const createdPayment = await tx.orm.public.Payment.create({
                id: payment.id,
                subscriptionId: subscription.id,
                userId: subscription.userId,
                method: payment.method,
                type: "SUBSCRIPTION",
                amount: toNumeric(payment.amount, MONEY_SCALE),
                status: payment.status,
                paidAt: payment.paidAt,
            });

            const orders = await tx.orm.public.Order.where({ subscriptionId: subscription.id })
                .orderBy(order => order.serviceDate.asc())
                .all();
            return {
                subscription: toSubscriptionRecord(createdSubscription),
                payment: toPaymentRecord(createdPayment),
                orders: orders.map(toOrderRecord),
            };
        });
    } catch (cause) {
        throw toCheckoutWriteError(cause) ?? new OrdersRepositoryFailureError("createCheckout", cause);
    }
}

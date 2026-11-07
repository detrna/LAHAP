import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { Db } from "../../../../../infrastructure/database/prisma/db.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import type {
    DeliveryMethodChangeRecord,
    PaymentChange,
    PaymentChangeResult,
    PaymentWithSubscription,
    UpgradeInPayment,
} from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { applyMethodChange, withSlotsOne } from "../method-changes/method-change-rows.js";
import { toOrderRecord, toPaymentRecord, toSubscriptionRecord } from "../to-records.js";

async function lockUpgrade(orm: Db["orm"], paymentId: string, lock: boolean): Promise<UpgradeInPayment | undefined> {
    const changes = orm.public.DeliveryMethodChange.where({ paymentId });
    const row = await (lock ? changes.forUpdate() : changes).first();
    const change = await withSlotsOne(orm, row);
    if (change === null) return undefined;
    return { change, orders: await lockOrders(orm, change, lock) };
}

async function lockOrders(orm: Db["orm"], change: DeliveryMethodChangeRecord, lock: boolean) {
    const ids = change.slots.map(slot => slot.orderId);
    if (ids.length === 0) return [];
    const orders = orm.public.Order.where(order => order.id.in(ids as Varchar<36>[])).orderBy(order =>
        order.serviceDate.asc(),
    );
    return (await (lock ? orders.forUpdate() : orders).all()).map(toOrderRecord);
}

export async function changePayment(
    this: PrismaOrdersRepository,
    paymentId: string,
    decide: (current: PaymentWithSubscription) => PaymentChange | null,
): Promise<PaymentChangeResult | null> {
    try {
        return await this.db.transaction(async tx => {
            const paymentRow = await tx.orm.public.Payment.where({ id: paymentId }).forUpdate().first();
            if (paymentRow === null) return null;
            const subscriptionRow = await tx.orm.public.Subscription.where({ id: paymentRow.subscriptionId })
                .forUpdate()
                .first();
            if (subscriptionRow === null) return null;

            const siblings = await tx.orm.public.Payment.where({ subscriptionId: subscriptionRow.id }).all();
            const methodChange =
                paymentRow.type === "DELIVERY_SERVICE_UPGRADE" ? await lockUpgrade(tx.orm, paymentId, true) : undefined;
            const before: PaymentWithSubscription = {
                payment: toPaymentRecord(paymentRow),
                subscription: toSubscriptionRecord(subscriptionRow),
                otherPayments: siblings.filter(row => row.id !== paymentId).map(toPaymentRecord),
                ...(methodChange !== undefined ? { methodChange } : {}),
            };
            const change = decide(before);
            if (change === null) return { before, after: null };

            const { status, paidAt, transactionId, method } = change.payment;
            const payment = await tx.orm.public.Payment.where({ id: paymentId }).update({
                status,
                ...(paidAt !== undefined ? { paidAt } : {}),
                ...(transactionId !== undefined ? { transactionId } : {}),
                ...(method !== undefined ? { method } : {}),
            });
            const subscriptionChange = change.subscription ?? {};
            const hasSubscriptionChange =
                subscriptionChange.status !== undefined || subscriptionChange.needsRefund !== undefined;
            if (hasSubscriptionChange) {
                await tx.orm.public.Subscription.where({ id: subscriptionRow.id }).update({
                    ...(subscriptionChange.status !== undefined ? { status: subscriptionChange.status } : {}),
                    ...(subscriptionChange.needsRefund !== undefined
                        ? { needsRefund: subscriptionChange.needsRefund }
                        : {}),
                });
            }
            const changeUpdate = change.methodChange;
            if (changeUpdate !== undefined && methodChange !== undefined) {
                if (changeUpdate.status !== undefined || changeUpdate.needsRefund !== undefined) {
                    await tx.orm.public.DeliveryMethodChange.where({ id: methodChange.change.id }).update({
                        ...(changeUpdate.status !== undefined ? { status: changeUpdate.status } : {}),
                        ...(changeUpdate.needsRefund !== undefined ? { needsRefund: changeUpdate.needsRefund } : {}),
                    });
                }
                if (changeUpdate.apply === true) await applyMethodChange(tx.orm, methodChange.change);
            }
            const subscription = await tx.orm.public.Subscription.where({ id: subscriptionRow.id }).first();
            if (payment === null || subscription === null) throw new Error("locked payment vanished");
            const changeAfter = methodChange === undefined ? undefined : await lockUpgrade(tx.orm, paymentId, false);
            return {
                before,
                after: {
                    payment: toPaymentRecord(payment),
                    subscription: toSubscriptionRecord(subscription),
                    otherPayments: before.otherPayments,
                    ...(changeAfter !== undefined ? { methodChange: changeAfter } : {}),
                },
            };
        });
    } catch (cause) {
        if (cause instanceof AppError) throw cause;
        throw new OrdersRepositoryFailureError("changePayment", cause);
    }
}

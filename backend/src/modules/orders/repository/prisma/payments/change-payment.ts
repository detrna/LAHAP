import { AppError } from "../../../../../shared/errors/app-error.js";
import type {
    PaymentChange,
    PaymentChangeResult,
    PaymentWithSubscription,
} from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { toPaymentRecord, toSubscriptionRecord } from "../to-records.js";

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

            const before = {
                payment: toPaymentRecord(paymentRow),
                subscription: toSubscriptionRecord(subscriptionRow),
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
            const subscription = hasSubscriptionChange
                ? await tx.orm.public.Subscription.where({ id: subscriptionRow.id }).update({
                      ...(subscriptionChange.status !== undefined ? { status: subscriptionChange.status } : {}),
                      ...(subscriptionChange.needsRefund !== undefined
                          ? { needsRefund: subscriptionChange.needsRefund }
                          : {}),
                  })
                : subscriptionRow;
            if (payment === null || subscription === null) throw new Error("locked payment vanished");
            return {
                before,
                after: { payment: toPaymentRecord(payment), subscription: toSubscriptionRecord(subscription) },
            };
        });
    } catch (cause) {
        if (cause instanceof AppError) throw cause;
        throw new OrdersRepositoryFailureError("changePayment", cause);
    }
}

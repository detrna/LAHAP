import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { toNumeric, toNumericOrNull } from "../../../../../infrastructure/database/prisma/numeric.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { InvalidStateError } from "../../../../../shared/errors/invalid-state-error.js";
import type { MethodChangeWrite, MethodChangeWriteResult } from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { toOrderRecord, toPaymentRecord, toSubscriptionRecord } from "../to-records.js";
import { applyMethodChange, withSlotsOne } from "./method-change-rows.js";

const MONEY_SCALE = 2;
const COORDINATE_SCALE = 8;

export async function createMethodChange(
    this: PrismaOrdersRepository,
    write: MethodChangeWrite,
): Promise<MethodChangeWriteResult> {
    const { change, slots, payment, apply } = write;
    try {
        return await this.db.transaction(async tx => {
            const subscription = await tx.orm.public.Subscription.where({ id: change.subscriptionId })
                .forUpdate()
                .first();
            if (subscription === null || subscription.status !== "Success") {
                throw new InvalidStateError("subscription is not paid");
            }
            const waiting = await tx.orm.public.DeliveryMethodChange.where({
                subscriptionId: change.subscriptionId,
                status: "Pending",
            }).first();
            if (waiting !== null) throw new InvalidStateError("another delivery method change is waiting for payment");

            const orderIds = slots.map(slot => slot.orderId);
            const locked = await tx.orm.public.Order.where(order => order.id.in(orderIds as Varchar<36>[]))
                .orderBy(order => order.serviceDate.asc())
                .forUpdate()
                .all();
            const stillSwitchable = locked.filter(
                order =>
                    order.subscriptionId === change.subscriptionId &&
                    order.status === "Terjadwal" &&
                    order.isDelivery !== change.toDelivery,
            );
            if (locked.length !== orderIds.length || stillSwitchable.length !== orderIds.length) {
                throw new InvalidStateError("slots changed, try again");
            }

            const createdPayment =
                payment === null
                    ? null
                    : await tx.orm.public.Payment.create({
                          id: payment.id,
                          subscriptionId: change.subscriptionId,
                          userId: subscription.userId,
                          method: payment.method,
                          type: "DELIVERY_SERVICE_UPGRADE",
                          amount: toNumeric(payment.amount, MONEY_SCALE),
                          status: payment.status,
                          paidAt: payment.paidAt,
                      });
            const created = await tx.orm.public.DeliveryMethodChange.create({
                id: change.id,
                subscriptionId: change.subscriptionId,
                requestedById: change.requestedById,
                toDelivery: change.toDelivery,
                effectiveFrom: change.effectiveFrom,
                status: change.status,
                slotCount: change.slotCount,
                deliveryFeePerSlot: toNumeric(change.deliveryFeePerSlot, MONEY_SCALE),
                amount: toNumeric(change.amount, MONEY_SCALE),
                needsRefund: change.needsRefund,
                paymentId: createdPayment?.id ?? null,
                deliveryAddress: change.deliveryAddress,
                deliveryLatitude: toNumericOrNull(change.deliveryLatitude, COORDINATE_SCALE),
                deliveryLongitude: toNumericOrNull(change.deliveryLongitude, COORDINATE_SCALE),
                deliveryDistanceKm: change.deliveryDistanceKm,
            });
            await tx.orm.public.DeliveryMethodChangeSlot.createAll(
                slots.map(slot => ({
                    changeId: created.id,
                    orderId: slot.orderId,
                    fee: toNumeric(slot.fee, MONEY_SCALE),
                })),
            );
            const record = await withSlotsOne(tx.orm, created);
            if (record === null) throw new Error("created delivery method change vanished");
            if (apply) await applyMethodChange(tx.orm, record);

            const after = await tx.orm.public.Subscription.where({ id: change.subscriptionId }).first();
            if (after === null) throw new Error("locked subscription vanished");
            return {
                change: record,
                payment: createdPayment === null ? null : toPaymentRecord(createdPayment),
                subscription: toSubscriptionRecord(after),
                slotsBefore: locked.map(toOrderRecord),
            };
        });
    } catch (cause) {
        if (cause instanceof AppError) throw cause;
        throw new OrdersRepositoryFailureError("createMethodChange", cause);
    }
}

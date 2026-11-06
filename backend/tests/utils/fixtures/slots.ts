import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { CreatedRows } from "../../../src/infrastructure/database/prisma/cleanup.js";
import type { Db } from "../../../src/infrastructure/database/prisma/db.js";
import type { OrderStatus } from "../../../src/modules/orders/domain/order.domain.js";
import type { PaymentMethod, PaymentStatus } from "../../../src/modules/orders/domain/payment.domain.js";
import type { SubscriptionStatus } from "../../../src/modules/orders/domain/subscription.domain.js";
import { createTestSubscription, type TestSubscriptionOptions } from "./subscriptions.js";

export interface TestSlotInput {
    readonly scheduleId: string;
    readonly status?: OrderStatus | undefined;
    readonly usesAlternativeMenu?: boolean | undefined;
    readonly skipReason?: string | undefined;
    readonly courierId?: string | undefined;
}

export interface TestPaymentInput {
    readonly method?: PaymentMethod | undefined;
    readonly status?: PaymentStatus | undefined;
    readonly amount?: number | undefined;
    readonly transactionId?: string | undefined;
    readonly paidAt?: Temporal.PlainDateTime | undefined;
}

export interface TestSlotsInput extends TestSubscriptionOptions {
    readonly userId: string;
    readonly packageId: string;
    readonly status: SubscriptionStatus;
    readonly slots: readonly TestSlotInput[];
    readonly payment?: TestPaymentInput | undefined;
}

export interface TestSlots {
    readonly subscriptionId: string;
    readonly slotIds: readonly string[];
    readonly paymentId: string | null;
}

function assertSlotFits(slot: TestSlotInput, isDelivery: boolean): void {
    if (slot.skipReason !== undefined && slot.status !== "Dilewati") {
        throw new Error("a skip reason needs the Dilewati status");
    }
    if (slot.status === "Diantar" && !isDelivery) throw new Error("a pick-up slot is never Diantar");
    if (slot.status === "Siap Diambil" && isDelivery) throw new Error("a delivered slot is never Siap Diambil");
}

async function readServiceDates(db: Db, packageId: string, slots: readonly TestSlotInput[]) {
    const ids = [...new Set(slots.map(slot => slot.scheduleId))];
    if (ids.length !== slots.length) throw new Error("each slot needs its own schedule");
    const schedules = await db.orm.public.Schedule.where(schedule => schedule.id.in(ids as Varchar<36>[]))
        .select("id", "packageId", "date")
        .all();
    if (schedules.length !== ids.length) throw new Error("a slot refers to an unknown schedule");
    const foreign = schedules.find(schedule => schedule.packageId !== packageId);
    if (foreign !== undefined) throw new Error(`schedule ${foreign.id} belongs to another package`);
    const dates = schedules.map(schedule => schedule.date).sort(Temporal.PlainDate.compare);
    const [startDate, endDate] = [dates[0], dates.at(-1)];
    if (startDate === undefined || endDate === undefined) throw new Error("createTestSlots needs at least one slot");
    return { startDate, endDate };
}

async function createTestPayment(
    db: Db,
    rows: CreatedRows,
    subscriptionId: string,
    userId: string,
    payment: TestPaymentInput,
): Promise<string> {
    const subscription = await db.orm.public.Subscription.where({ id: subscriptionId }).select("totalPrice").first();
    if (subscription === null) throw new Error(`subscription ${subscriptionId} vanished`);
    const created = await db.orm.public.Payment.create({
        subscriptionId,
        userId,
        method: payment.method ?? "MIDTRANS",
        type: "SUBSCRIPTION",
        amount: payment.amount !== undefined ? payment.amount.toFixed(2) : subscription.totalPrice,
        status: payment.status ?? "Success",
        transactionId: payment.transactionId ?? null,
        paidAt: payment.paidAt ?? null,
    });
    return rows.track("Payment", created.id);
}

export async function createTestSlots(db: Db, rows: CreatedRows, input: TestSlotsInput): Promise<TestSlots> {
    const { slots, payment, ...subscription } = input;
    if (slots.length === 0) throw new Error("createTestSlots needs at least one slot");
    for (const slot of slots) assertSlotFits(slot, input.isDelivery ?? false);
    const dates = await readServiceDates(db, input.packageId, slots);
    const subscriptionId = await createTestSubscription(db, rows, {
        ...subscription,
        ...dates,
        slotCount: slots.length,
    });
    const paymentId =
        payment === undefined ? null : await createTestPayment(db, rows, subscriptionId, input.userId, payment);
    const slotIds: string[] = [];
    for (const slot of slots) {
        const created = await db.orm.public.Order.create({
            subscriptionId,
            menuScheduleId: slot.scheduleId,
            status: slot.status ?? "Terjadwal",
            usesAlternativeMenu: slot.usesAlternativeMenu ?? false,
            skipReason: slot.skipReason ?? null,
            courierId: slot.courierId ?? null,
        });
        slotIds.push(rows.track("Order", created.id));
    }
    return { subscriptionId, slotIds, paymentId };
}

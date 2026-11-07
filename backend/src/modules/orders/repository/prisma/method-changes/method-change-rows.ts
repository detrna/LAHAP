import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { Db } from "../../../../../infrastructure/database/prisma/db.js";
import {
    fromNumeric,
    fromNumericOrNull,
    toNumeric,
    toNumericOrNull,
} from "../../../../../infrastructure/database/prisma/numeric.js";
import type { DeliveryMethodChangeStatus } from "../../../domain/delivery-method-change.domain.js";
import type {
    DeliveryMethodChangeRecord,
    DeliveryMethodChangeSlotRecord,
} from "../../../service/interfaces/orders.repository.js";

type Orm = Db["orm"];

const MONEY_SCALE = 2;
const COORDINATE_SCALE = 8;

export interface MethodChangeRow {
    readonly id: string;
    readonly subscriptionId: string;
    readonly requestedById: string;
    readonly toDelivery: boolean;
    readonly effectiveFrom: Temporal.PlainDate;
    readonly status: string;
    readonly slotCount: number;
    readonly deliveryFeePerSlot: string;
    readonly amount: string;
    readonly needsRefund: boolean;
    readonly refundedAt: Temporal.PlainDateTime | null;
    readonly paymentId: string | null;
    readonly deliveryAddress: string | null;
    readonly deliveryLatitude: string | null;
    readonly deliveryLongitude: string | null;
    readonly deliveryDistanceKm: number | null;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

function toMethodChangeRecord(
    row: MethodChangeRow,
    slots: readonly DeliveryMethodChangeSlotRecord[],
): DeliveryMethodChangeRecord {
    return {
        id: row.id,
        subscriptionId: row.subscriptionId,
        requestedById: row.requestedById,
        toDelivery: row.toDelivery,
        effectiveFrom: row.effectiveFrom,
        status: row.status as DeliveryMethodChangeStatus,
        slotCount: row.slotCount,
        deliveryFeePerSlot: fromNumeric(row.deliveryFeePerSlot),
        amount: fromNumeric(row.amount),
        needsRefund: row.needsRefund,
        refundedAt: row.refundedAt,
        paymentId: row.paymentId,
        deliveryAddress: row.deliveryAddress,
        deliveryLatitude: fromNumericOrNull(row.deliveryLatitude),
        deliveryLongitude: fromNumericOrNull(row.deliveryLongitude),
        deliveryDistanceKm: row.deliveryDistanceKm,
        slots,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function withSlots(
    orm: Orm,
    rows: readonly MethodChangeRow[],
): Promise<readonly DeliveryMethodChangeRecord[]> {
    if (rows.length === 0) return [];
    const links = await orm.public.DeliveryMethodChangeSlot.where(link =>
        link.changeId.in(rows.map(row => row.id) as Varchar<36>[]),
    ).all();
    const orderIds = [...new Set(links.map(link => link.orderId))];
    const orders =
        orderIds.length === 0
            ? []
            : await orm.public.Order.where(order => order.id.in(orderIds as Varchar<36>[]))
                  .select("id", "serviceDate")
                  .all();
    const dateById = new Map(orders.map(order => [order.id, order.serviceDate]));
    const slotsByChange = new Map<string, DeliveryMethodChangeSlotRecord[]>();
    for (const link of links) {
        const serviceDate = dateById.get(link.orderId);
        if (serviceDate === undefined) continue;
        const list = slotsByChange.get(link.changeId) ?? [];
        list.push({ orderId: link.orderId, serviceDate, fee: fromNumeric(link.fee) });
        slotsByChange.set(link.changeId, list);
    }
    return rows.map(row =>
        toMethodChangeRecord(
            row,
            (slotsByChange.get(row.id) ?? []).sort(
                (a, b) =>
                    Temporal.PlainDate.compare(a.serviceDate, b.serviceDate) || a.orderId.localeCompare(b.orderId),
            ),
        ),
    );
}

export async function withSlotsOne(orm: Orm, row: MethodChangeRow | null): Promise<DeliveryMethodChangeRecord | null> {
    if (row === null) return null;
    const [record] = await withSlots(orm, [row]);
    return record ?? null;
}

export async function applyMethodChange(orm: Orm, change: DeliveryMethodChangeRecord): Promise<void> {
    const orderIds = change.slots.map(slot => slot.orderId);
    if (orderIds.length > 0) {
        await orm.public.Order.where(order => order.id.in(orderIds as Varchar<36>[])).updateAll({
            isDelivery: change.toDelivery,
            deliveryFee: toNumeric(change.toDelivery ? change.deliveryFeePerSlot : 0, MONEY_SCALE),
            ...(change.toDelivery ? {} : { courierId: null }),
        });
    }
    const point = change.toDelivery
        ? {
              deliveryAddress: change.deliveryAddress,
              deliveryLatitude: toNumericOrNull(change.deliveryLatitude, COORDINATE_SCALE),
              deliveryLongitude: toNumericOrNull(change.deliveryLongitude, COORDINATE_SCALE),
              deliveryDistanceKm: change.deliveryDistanceKm,
          }
        : {};
    await orm.public.Subscription.where({ id: change.subscriptionId }).update({
        isDelivery: change.toDelivery,
        ...point,
    });
}

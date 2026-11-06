import { OrderNotFoundError } from "../../../../shared/errors/order-not-found-error.js";
import { toIsoTimestamp } from "../../../../shared/time/timestamp.js";
import type { Order, OrderStatus } from "../../domain/order.domain.js";
import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";
import type { Page, SlotWithSubscription } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";
import { toSubscription } from "../present.js";

export interface AdminSlotFilter {
    readonly date?: Temporal.PlainDate | undefined;
    readonly deliveryTime?: Temporal.PlainTime | undefined;
    readonly status?: OrderStatus | undefined;
    readonly isDelivery?: boolean | undefined;
    readonly courierId?: string | undefined;
    readonly unassigned?: boolean | undefined;
    readonly packageId?: string | undefined;
    readonly subscriptionId?: string | undefined;
    readonly skip: number;
    readonly take: number;
}

async function presentAdminSlots(service: OrdersService, slots: readonly SlotWithSubscription[]): Promise<Order[]> {
    const userIds = slots.flatMap(({ order, subscription }) => [
        subscription.userId,
        ...(order.courierId !== null ? [order.courierId] : []),
    ]);
    const [orders, users] = await Promise.all([
        service.presentOrders(slots.map(slot => slot.order)),
        service.customers.getSummaries([...new Set(userIds)]),
    ]);
    const userById = new Map(users.map(user => [user.id, user]));
    const today = service.clock.now().toPlainDate();
    return orders.map((order, index) => {
        const { subscription } = slots[index]!;
        const customer = userById.get(subscription.userId);
        return {
            ...order,
            subscription: {
                ...toSubscription(subscription, today),
                ...(customer !== undefined ? { user: customer } : {}),
            },
            courier: order.courierId === null ? null : (userById.get(order.courierId) ?? null),
        };
    });
}

export async function listSlotsForAdmin(this: OrdersService, filter: AdminSlotFilter): Promise<Page<Order>> {
    const { date = this.clock.now().toPlainDate(), deliveryTime, ...rest } = filter;
    const menuScheduleIds =
        deliveryTime === undefined
            ? undefined
            : (await this.catalog.findSchedules({ from: date, to: date, deliveryTime })).map(schedule => schedule.id);
    const { items, total } = await this.ordersRepository.listSlots({
        ...rest,
        date,
        menuScheduleIds,
        subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
    });
    return { items: await presentAdminSlots(this, items), total };
}

export async function getSlotForAdmin(this: OrdersService, orderId: string): Promise<Order> {
    const slot = await this.ordersRepository.findSlotWithSubscription(orderId);
    if (slot === null) throw new OrderNotFoundError();
    const history = await this.ordersRepository.findStatusHistory(orderId);
    const actorIds = [...new Set(history.flatMap(entry => (entry.changedById === null ? [] : [entry.changedById])))];
    const [[order], actors] = await Promise.all([
        presentAdminSlots(this, [slot]),
        this.customers.getSummaries(actorIds),
    ]);
    const actorById = new Map(actors.map(actor => [actor.id, actor]));
    return {
        ...order!,
        statusHistory: history.map(entry => ({
            id: entry.id,
            orderId: entry.orderId,
            fromStatus: entry.fromStatus,
            toStatus: entry.toStatus,
            changedById: entry.changedById,
            changedBy: entry.changedById === null ? null : (actorById.get(entry.changedById) ?? null),
            adminNote: entry.adminNote,
            changedAt: toIsoTimestamp(entry.changedAt),
        })),
    };
}

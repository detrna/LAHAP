import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { OrderNotFoundError } from "../../../../shared/errors/order-not-found-error.js";
import { findClashingAllergies } from "../../../../shared/utils/allergy-clash/allergy-clash.js";
import type { Menu } from "../../../catalog/domain/menu.domain.js";
import type { Order } from "../../domain/order.domain.js";
import type { OrderRecord, SubscriptionRecord } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

const BEFORE_FOOD_READY = ["Terjadwal", "Disiapkan"] as const;

async function menuChangeBody(
    service: OrdersService,
    subscription: SubscriptionRecord,
    primary: Menu,
    served: Menu,
    usesAlternativeMenu: boolean,
): Promise<string> {
    if (!usesAlternativeMenu) return `Menu kamu kembali ke ${served.name}.`;
    const [profile] = await service.customers.getAllergyProfiles([subscription.userId]);
    const clashing = findClashingAllergies(profile?.allergyIds ?? [], primary.allergies ?? []);
    const reason = clashing.length > 0 ? ` karena alergi ${clashing.map(allergy => allergy.name).join(", ")}` : "";
    return `Menu kamu diganti ke ${served.name}${reason}.`;
}

async function announceMenuChange(
    service: OrdersService,
    order: OrderRecord,
    subscription: SubscriptionRecord,
    primary: Menu,
    served: Menu,
): Promise<void> {
    const { userId } = subscription;
    const notify = async () => {
        const body = await menuChangeBody(service, subscription, primary, served, order.usesAlternativeMenu);
        await service.notifier.notifyUser({ userId, title: "Menu diganti", body });
    };
    await Promise.all([
        notify().catch((err: unknown) => {
            service.logger.warn({ err, orderId: order.id }, "menu change notification failed");
        }),
        service.realtime
            .publish(
                { userIds: [userId], roles: ["ADMIN", "KITCHEN"] },
                {
                    event: "slot.menu",
                    data: { orderId: order.id, usesAlternativeMenu: order.usesAlternativeMenu, menu: served },
                },
            )
            .catch((err: unknown) => {
                service.logger.warn({ err, orderId: order.id }, "slot menu event was not delivered");
            }),
    ]);
}

export async function setAlternativeMenu(
    this: OrdersService,
    orderId: string,
    usesAlternativeMenu: boolean,
): Promise<Order> {
    const slot = await this.ordersRepository.findSlotWithSubscription(orderId);
    if (slot === null || slot.subscription.status !== "Success") throw new OrderNotFoundError();
    if (!BEFORE_FOOD_READY.some(status => status === slot.order.status)) {
        throw new InvalidStateError("slot is past food preparation");
    }

    const [schedule] = await this.catalog.getSchedulesByIds([slot.order.menuScheduleId]);
    const primary = schedule?.menus?.find(link => link.isPrimary)?.menu;
    const alternative = schedule?.menus?.find(link => !link.isPrimary)?.menu;
    if (usesAlternativeMenu && alternative === undefined)
        throw new InvalidStateError("schedule has no alternative menu");
    if (primary === undefined) throw new InvalidStateError("schedule has no primary menu");

    let order = slot.order;
    if (order.usesAlternativeMenu !== usesAlternativeMenu) {
        const updated = await this.ordersRepository.setUsesAlternativeMenu({
            orderId,
            usesAlternativeMenu,
            allowedStatuses: BEFORE_FOOD_READY,
        });
        if (updated === null) throw new InvalidStateError("slot is past food preparation");
        order = updated;
        await announceMenuChange(this, order, slot.subscription, primary, usesAlternativeMenu ? alternative! : primary);
    }

    const [presented] = await this.presentOrders([order]);
    return presented!;
}

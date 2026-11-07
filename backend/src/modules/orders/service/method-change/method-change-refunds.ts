import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { toDbTimestamp } from "../../../../shared/time/timestamp.js";
import type { DeliveryMethodChange } from "../../domain/delivery-method-change.domain.js";
import type { Page } from "../interfaces/orders.repository.js";
import { DeliveryMethodChangeNotFoundError } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";
import { toDeliveryMethodChange } from "../present.js";

export interface AdminMethodChangeFilter {
    readonly needsRefund?: boolean | undefined;
    readonly skip: number;
    readonly take: number;
}

export async function listMethodChangesForAdmin(
    this: OrdersService,
    filter: AdminMethodChangeFilter,
): Promise<Page<DeliveryMethodChange>> {
    const { items, total } = await this.ordersRepository.listMethodChanges(filter);
    return { items: items.map(toDeliveryMethodChange), total };
}

export async function confirmMethodChangeRefund(this: OrdersService, changeId: string): Promise<DeliveryMethodChange> {
    const change = await this.ordersRepository.findMethodChangeById(changeId);
    if (change === null) throw new DeliveryMethodChangeNotFoundError();
    if (!change.needsRefund) throw new InvalidStateError("delivery method change does not need a refund");
    const confirmed = await this.ordersRepository.confirmMethodChangeRefund(changeId, toDbTimestamp(this.clock.now()));
    if (confirmed === null) throw new InvalidStateError("delivery method change does not need a refund");
    return toDeliveryMethodChange(confirmed);
}

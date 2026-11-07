import type { DeliveryMethodPreview } from "../../domain/delivery-method-change.domain.js";
import type { OrdersService } from "../orders.service.js";
import type { MethodChangeActor, MethodChangeInput } from "./method-change-input.js";

export async function previewMethodChange(
    this: OrdersService,
    actor: MethodChangeActor,
    subscriptionId: string,
    input: MethodChangeInput,
): Promise<DeliveryMethodPreview> {
    const { effectiveFrom, slots, quote, delivery } = await this.quoteMethodChange(actor, subscriptionId, input);
    const dateById = new Map(slots.map(slot => [slot.id, slot.serviceDate.toString()]));
    return {
        toDelivery: input.isDelivery,
        effectiveFrom: effectiveFrom.toString(),
        slots: quote.slots.map(slot => ({ ...slot, serviceDate: dateById.get(slot.orderId)! })),
        slotCount: quote.slots.length,
        deliveryFeePerSlot: quote.deliveryFeePerSlot,
        amount: quote.amount,
        delivery,
    };
}

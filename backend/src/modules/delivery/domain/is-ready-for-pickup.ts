import type { OrderStatus } from "../../orders/domain/order.domain.js";

export function isReadyForPickup(status: OrderStatus): boolean {
    return status === "Diantar";
}

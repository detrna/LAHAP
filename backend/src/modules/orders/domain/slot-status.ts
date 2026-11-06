import type { OrderStatus } from "./order.domain.js";

const DELIVERY_PATH: readonly OrderStatus[] = ["Terjadwal", "Disiapkan", "Diantar", "Selesai"];
const PICKUP_PATH: readonly OrderStatus[] = ["Terjadwal", "Disiapkan", "Siap Diambil", "Selesai"];
const SKIPPABLE: readonly OrderStatus[] = ["Terjadwal", "Disiapkan"];

export function slotPath(isDelivery: boolean): readonly OrderStatus[] {
    return isDelivery ? DELIVERY_PATH : PICKUP_PATH;
}

export function foodReadyStatus(isDelivery: boolean): OrderStatus {
    return isDelivery ? "Diantar" : "Siap Diambil";
}

export function isSkippable(status: OrderStatus): boolean {
    return SKIPPABLE.includes(status);
}

export function isForwardOnPath(isDelivery: boolean, from: OrderStatus, to: OrderStatus): boolean {
    const path = slotPath(isDelivery);
    const fromIndex = path.indexOf(from);
    const toIndex = path.indexOf(to);
    return fromIndex !== -1 && toIndex > fromIndex;
}

export function canCorrect(isDelivery: boolean, from: OrderStatus, to: OrderStatus): boolean {
    if (to === "Dilewati") return isSkippable(from);
    return isForwardOnPath(isDelivery, from, to);
}

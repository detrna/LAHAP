import type { KitchenSlot } from "../../domain/to-cook-source.js";

export interface KitchenSlots {
    listKitchenSlots(scheduleIds: readonly string[]): Promise<readonly KitchenSlot[]>;
}

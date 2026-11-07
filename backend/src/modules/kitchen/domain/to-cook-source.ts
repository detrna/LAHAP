import type { Menu } from "../../catalog/domain/menu.domain.js";
import type { ScheduleSummary } from "../../catalog/domain/schedule.domain.js";

export interface KitchenSlot {
    readonly orderId: string;
    readonly menuScheduleId: string;
    readonly usesAlternativeMenu: boolean;
    readonly userId: string;
    readonly recipientName: string;
    readonly isDelivery: boolean;
    readonly notes: string | null;
}

export interface CustomerAllergyProfile {
    readonly userId: string;
    readonly allergyIds: readonly string[];
    readonly allergyNote: string | null;
}

export interface ServedSlot {
    readonly slot: KitchenSlot;
    readonly schedule: ScheduleSummary;
    readonly primaryMenuId: string;
    readonly servedMenuId: string;
}

export interface ToCookLookups {
    readonly menus: ReadonlyMap<string, Menu>;
    readonly packageNames: ReadonlyMap<string, string>;
    readonly profiles: ReadonlyMap<string, CustomerAllergyProfile>;
}

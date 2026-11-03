import type { ShoppingListItem } from "../../ingredients/domain/ingredient.domain.js";
import type { PurchaseType } from "./subscription.domain.js";

export interface DashboardStats {
    readonly period: "today" | "week" | "month";
    readonly from: string;
    readonly to: string;
    readonly income: {
        readonly orderCount: number;
        readonly foodRevenue: number;
        readonly tierDiscount: number;
        readonly promoDiscount: number;
        readonly deliveryRevenue: number;
        readonly totalRevenue: number;
    };
    readonly topMenus: readonly {
        readonly menuId: string;
        readonly name: string;
        readonly portions: number;
    }[];
    readonly shortages: readonly ShoppingListItem[];
    readonly unreadNotificationCount: number;
}

export interface IncomeReport {
    readonly period: "today" | "week" | "month";
    readonly from: string;
    readonly to: string;
    readonly total: {
        readonly orderCount: number;
        readonly foodRevenue: number;
        readonly tierDiscount: number;
        readonly promoDiscount: number;
        readonly deliveryRevenue: number;
        readonly totalRevenue: number;
    };
    readonly byPackage: readonly ({
        readonly orderCount: number;
        readonly foodRevenue: number;
        readonly tierDiscount: number;
        readonly promoDiscount: number;
        readonly deliveryRevenue: number;
        readonly totalRevenue: number;
    } & {
        readonly packageId: string;
        readonly packageName: string;
    })[];
    readonly byPurchaseType: readonly ({
        readonly orderCount: number;
        readonly foodRevenue: number;
        readonly tierDiscount: number;
        readonly promoDiscount: number;
        readonly deliveryRevenue: number;
        readonly totalRevenue: number;
    } & {
        readonly purchaseType: PurchaseType;
    })[];
}

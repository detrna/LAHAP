import type { CustomerAllergyProfile, KitchenSlot } from "../../domain/to-cook-source.js";
import type { ToCookMenu, ToCookIngredient, SpecialCategoryEntry, ToCookReport } from "../../domain/to-cook.domain.js";

export function buildToCookMenu(overrides: Partial<ToCookMenu> = {}): ToCookMenu {
    return {
        packageId: "00000000-0000-4000-8000-000000000001",
        packageName: "test packageName",
        menuId: "00000000-0000-4000-8000-000000000001",
        name: "test name",
        isAlternative: false,
        deliveryTime: { time: "07:00", range: "Pagi" },
        portions: 0,
        ...overrides,
    };
}

export function buildToCookIngredient(overrides: Partial<ToCookIngredient> = {}): ToCookIngredient {
    return {
        ingredientId: "00000000-0000-4000-8000-000000000001",
        name: "test name",
        unit: "kg",
        totalQuantity: 0,
        ...overrides,
    };
}

export function buildSpecialCategoryEntry(overrides: Partial<SpecialCategoryEntry> = {}): SpecialCategoryEntry {
    return {
        orderId: "00000000-0000-4000-8000-000000000001",
        recipientName: "test recipientName",
        isDelivery: false,
        deliveryTime: { time: "07:00", range: "Pagi" },
        reasons: [],
        primaryMenuId: "00000000-0000-4000-8000-000000000001",
        alternativeMenuId: null,
        usesAlternativeMenu: false,
        ...overrides,
    };
}

export function buildToCookReport(overrides: Partial<ToCookReport> = {}): ToCookReport {
    return { date: "2026-11-03", deliveryTime: null, menus: [], ingredients: [], specialCategory: [], ...overrides };
}

export function buildKitchenSlot(overrides: Partial<KitchenSlot> = {}): KitchenSlot {
    return {
        orderId: "00000000-0000-4000-8000-000000000001",
        menuScheduleId: "00000000-0000-4000-8000-000000000001",
        usesAlternativeMenu: false,
        userId: "00000000-0000-4000-8000-000000000001",
        recipientName: "test recipientName",
        isDelivery: false,
        notes: null,
        ...overrides,
    };
}

export function buildCustomerAllergyProfile(overrides: Partial<CustomerAllergyProfile> = {}): CustomerAllergyProfile {
    return { userId: "00000000-0000-4000-8000-000000000001", allergyIds: [], allergyNote: null, ...overrides };
}

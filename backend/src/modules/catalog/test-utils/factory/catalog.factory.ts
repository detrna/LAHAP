import type { Allergy } from "../../domain/allergy.domain.js";
import type { MenuIngredient, Menu } from "../../domain/menu.domain.js";
import type { Package } from "../../domain/package.domain.js";
import type { ScheduleMenu, MenuSchedule, PublishMenuSchedulesResult } from "../../domain/schedule.domain.js";

export function buildAllergy(overrides: Partial<Allergy> = {}): Allergy {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Kacang",
        createdAt: "2026-11-03T00:00:00.000Z",
        updatedAt: "2026-11-03T00:00:00.000Z",
        ...overrides,
    };
}

export function buildMenuIngredient(overrides: Partial<MenuIngredient> = {}): MenuIngredient {
    return { ingredientId: "00000000-0000-4000-8000-000000000001", quantityPerPortion: 0, ...overrides };
}

export function buildMenu(overrides: Partial<Menu> = {}): Menu {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Ayam Bakar Madu",
        description: "test description",
        isAlternative: false,
        tags: ["Pedas", "Tinggi Protein"],
        photoKey: "menus/2026/11/3f2b6c1e.webp",
        photoUrl: "https://example.com/photoUrl",
        createdAt: "2026-11-03T00:00:00.000Z",
        updatedAt: "2026-11-03T00:00:00.000Z",
        ...overrides,
    };
}

export function buildPackage(overrides: Partial<Package> = {}): Package {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Diet Sehat",
        description: "test description",
        basePrice: 0,
        periods: [],
        deliveryTimes: [],
        deliveryFreeRadius: null,
        deliveryMaxDistance: null,
        deliveryPricePerKm: null,
        photoKey: "menus/2026/11/3f2b6c1e.webp",
        photoUrl: "https://example.com/photoUrl",
        startAt: "2026-11-03T00:00:00.000Z",
        endAt: null,
        isActive: true,
        isAvailable: false,
        createdAt: "2026-11-03T00:00:00.000Z",
        updatedAt: "2026-11-03T00:00:00.000Z",
        ...overrides,
    };
}

export function buildScheduleMenu(overrides: Partial<ScheduleMenu> = {}): ScheduleMenu {
    return { menuId: "00000000-0000-4000-8000-000000000001", isPrimary: false, ...overrides };
}

export function buildMenuSchedule(overrides: Partial<MenuSchedule> = {}): MenuSchedule {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        packageId: "00000000-0000-4000-8000-000000000001",
        date: "2026-11-03",
        deliveryTime: { time: "07:00", range: "Pagi" },
        isPublished: false,
        createdAt: "2026-11-03T00:00:00.000Z",
        updatedAt: "2026-11-03T00:00:00.000Z",
        ...overrides,
    };
}

export function buildPublishMenuSchedulesResult(
    overrides: Partial<PublishMenuSchedulesResult> = {},
): PublishMenuSchedulesResult {
    return { updatedCount: 0, ...overrides };
}

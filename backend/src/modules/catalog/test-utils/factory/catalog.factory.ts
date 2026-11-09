import type { Allergy } from "../../domain/allergy.domain.js";
import type { MenuComponent, MenuIngredient, Menu, MenuIngredientUsage, RecipeLine } from "../../domain/menu.domain.js";
import type { Package } from "../../domain/package.domain.js";
import type {
    ScheduleMenu,
    MenuSchedule,
    PublishMenuSchedulesResult,
    ScheduleSummary,
} from "../../domain/schedule.domain.js";
import type {
    AllergyRecord,
    MenuComponentRecord,
    MenuRecord,
    PackageRecord,
    ScheduleRecord,
} from "../../service/interfaces/catalog.repository.js";

export function buildAllergy(overrides: Partial<Allergy> = {}): Allergy {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Kacang",
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildAllergyRecord(overrides: Partial<AllergyRecord> = {}): AllergyRecord {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Kacang",
        createdAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        updatedAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        ...overrides,
    };
}

export function buildMenuIngredient(overrides: Partial<MenuIngredient> = {}): MenuIngredient {
    return { ingredientId: "00000000-0000-4000-8000-000000000001", quantityPerPortion: 0, ...overrides };
}

export function buildMenuComponent(overrides: Partial<MenuComponent> = {}): MenuComponent {
    return { id: "00000000-0000-4000-8000-000000000001", name: "Nasi Putih", ...overrides };
}

export function buildMenuComponentRecord(overrides: Partial<MenuComponentRecord> = {}): MenuComponentRecord {
    return { id: "00000000-0000-4000-8000-000000000001", name: "Nasi Putih", cookId: null, ...overrides };
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
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        components: [],
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
        startAt: "2026-11-03T00:00:00.000+07:00",
        endAt: null,
        isActive: true,
        isAvailable: false,
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildPackageRecord(overrides: Partial<PackageRecord> = {}): PackageRecord {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Diet Sehat",
        description: "test description",
        basePrice: 20000,
        periods: ["Harian", "Mingguan"],
        deliveryTimes: [Temporal.PlainTime.from("07:00"), Temporal.PlainTime.from("12:00")],
        deliveryFreeRadius: null,
        deliveryMaxDistance: null,
        deliveryPricePerKm: null,
        photoKey: "packages/2026/11/3f2b6c1e.webp",
        startAt: Temporal.PlainDateTime.from("2026-11-01T00:00:00"),
        endAt: null,
        isActive: true,
        createdAt: Temporal.PlainDateTime.from("2026-11-01T00:00:00"),
        updatedAt: Temporal.PlainDateTime.from("2026-11-01T00:00:00"),
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
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildPublishMenuSchedulesResult(
    overrides: Partial<PublishMenuSchedulesResult> = {},
): PublishMenuSchedulesResult {
    return { updatedCount: 0, ...overrides };
}

export function buildRecipeLine(overrides: Partial<RecipeLine> = {}): RecipeLine {
    return {
        menuId: "00000000-0000-4000-8000-000000000001",
        ingredientId: "00000000-0000-4000-8000-000000000002",
        quantityPerPortion: 0.25,
        ...overrides,
    };
}

export function buildMenuIngredientUsage(overrides: Partial<MenuIngredientUsage> = {}): MenuIngredientUsage {
    return {
        ingredientId: "00000000-0000-4000-8000-000000000002",
        menuId: "00000000-0000-4000-8000-000000000001",
        menuName: "Ayam Bakar Madu",
        ...overrides,
    };
}

export function buildScheduleSummary(overrides: Partial<ScheduleSummary> = {}): ScheduleSummary {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        packageId: "00000000-0000-4000-8000-000000000001",
        date: "2026-11-03",
        deliveryTime: { time: "07:00", range: "Pagi" },
        isPublished: false,
        primaryMenuId: null,
        alternativeMenuId: null,
        ...overrides,
    };
}

export function buildMenuRecord(overrides: Partial<MenuRecord> = {}): MenuRecord {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Ayam Bakar Madu",
        description: "test description",
        isAlternative: false,
        tags: ["Pedas"],
        photoKey: "menus/2026/11/3f2b6c1e.webp",
        createdAt: Temporal.PlainDateTime.from("2026-11-01T00:00:00"),
        updatedAt: Temporal.PlainDateTime.from("2026-11-01T00:00:00"),
        ingredients: [{ ingredientId: "00000000-0000-4000-8000-000000000002", quantityPerPortion: 0.25 }],
        components: [],
        ...overrides,
    };
}

export function buildScheduleRecord(overrides: Partial<ScheduleRecord> = {}): ScheduleRecord {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        packageId: "00000000-0000-4000-8000-000000000001",
        date: Temporal.PlainDate.from("2026-11-12"),
        deliveryTime: Temporal.PlainTime.from("07:00"),
        isPublished: false,
        primaryMenuId: "00000000-0000-4000-8000-000000000011",
        alternativeMenuId: null,
        createdAt: Temporal.PlainDateTime.from("2026-11-01T00:00:00"),
        updatedAt: Temporal.PlainDateTime.from("2026-11-01T00:00:00"),
        ...overrides,
    };
}

import type { OrderPeriod } from "../../domain/package.domain.js";

export * from "../../domain/errors.js";

export interface AllergyRecord {
    readonly id: string;
    readonly name: string;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface AllergyListQuery {
    readonly search?: string | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface AllergyListRecord {
    readonly items: readonly AllergyRecord[];
    readonly total: number;
}

export interface PackageRecord {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly basePrice: number;
    readonly periods: readonly OrderPeriod[];
    readonly deliveryTimes: readonly Temporal.PlainTime[];
    readonly deliveryFreeRadius: number | null;
    readonly deliveryMaxDistance: number | null;
    readonly deliveryPricePerKm: number | null;
    readonly photoKey: string;
    readonly startAt: Temporal.PlainDateTime;
    readonly endAt: Temporal.PlainDateTime | null;
    readonly isActive: boolean;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface NewPackageRecord {
    readonly name: string;
    readonly description: string;
    readonly basePrice: number;
    readonly periods: readonly OrderPeriod[];
    readonly deliveryTimes: readonly Temporal.PlainTime[];
    readonly deliveryFreeRadius: number | null;
    readonly deliveryMaxDistance: number | null;
    readonly deliveryPricePerKm: number | null;
    readonly photoKey: string;
    readonly startAt: Temporal.PlainDateTime;
    readonly endAt: Temporal.PlainDateTime | null;
    readonly isActive: boolean;
}

export interface PackageChanges {
    readonly name?: string | undefined;
    readonly description?: string | undefined;
    readonly basePrice?: number | undefined;
    readonly periods?: readonly OrderPeriod[] | undefined;
    readonly deliveryTimes?: readonly Temporal.PlainTime[] | undefined;
    readonly deliveryFreeRadius?: number | null | undefined;
    readonly deliveryMaxDistance?: number | null | undefined;
    readonly deliveryPricePerKm?: number | null | undefined;
    readonly photoKey?: string | undefined;
    readonly startAt?: Temporal.PlainDateTime | undefined;
    readonly endAt?: Temporal.PlainDateTime | null | undefined;
    readonly isActive?: boolean | undefined;
}

export interface RemovedMealTimes {
    readonly times: readonly Temporal.PlainTime[];
    readonly from: Temporal.PlainDate;
}

export interface MealTimeChange {
    readonly from: Temporal.PlainTime;
    readonly to: Temporal.PlainTime;
}

export interface MovedMealTimes {
    readonly changes: readonly MealTimeChange[];
    readonly from: Temporal.PlainDate;
}

export interface UpdatePackageOptions {
    readonly deleteSchedulesAt?: RemovedMealTimes | undefined;
    readonly moveSchedulesAt?: MovedMealTimes | undefined;
}

export interface PackageListQuery {
    readonly search?: string | undefined;
    readonly isActive?: boolean | undefined;
    readonly availableAt?: Temporal.PlainDateTime | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface PackageListRecord {
    readonly items: readonly PackageRecord[];
    readonly total: number;
}

export interface MenuIngredientRecord {
    readonly ingredientId: string;
    readonly quantityPerPortion: number;
}

export interface MenuComponentRecord {
    readonly id: string;
    readonly name: string;
    readonly cookId: string | null;
}

export interface NewMenuComponentRecord {
    readonly name: string;
    readonly cookId: string | null;
}

export interface MenuRecord {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly isAlternative: boolean;
    readonly tags: readonly string[];
    readonly photoKey: string;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
    readonly ingredients: readonly MenuIngredientRecord[];
    readonly components: readonly MenuComponentRecord[];
}

export interface NewMenuRecord {
    readonly name: string;
    readonly description: string;
    readonly isAlternative: boolean;
    readonly tags: readonly string[];
    readonly photoKey: string;
    readonly ingredients: readonly MenuIngredientRecord[];
    readonly components: readonly NewMenuComponentRecord[];
}

export interface MenuChanges {
    readonly name?: string | undefined;
    readonly description?: string | undefined;
    readonly isAlternative?: boolean | undefined;
    readonly tags?: readonly string[] | undefined;
    readonly photoKey?: string | undefined;
    readonly ingredients?: readonly MenuIngredientRecord[] | undefined;
    readonly components?: readonly NewMenuComponentRecord[] | undefined;
}

export interface MenuListQuery {
    readonly search?: string | undefined;
    readonly isAlternative?: boolean | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface MenuListRecord {
    readonly items: readonly MenuRecord[];
    readonly total: number;
}

export interface MenuKindRecord {
    readonly id: string;
    readonly isAlternative: boolean;
}

export type ScheduleMenuRole = "primary" | "alternative";

export interface MenuUsageRecord {
    readonly ingredientId: string;
    readonly menuId: string;
    readonly menuName: string;
}

export interface RecipeLineRecord {
    readonly menuId: string;
    readonly ingredientId: string;
    readonly quantityPerPortion: number;
}

export interface ScheduleRecord {
    readonly id: string;
    readonly packageId: string;
    readonly date: Temporal.PlainDate;
    readonly deliveryTime: Temporal.PlainTime;
    readonly isPublished: boolean;
    readonly primaryMenuId: string | null;
    readonly alternativeMenuId: string | null;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface NewScheduleRecord {
    readonly packageId: string;
    readonly date: Temporal.PlainDate;
    readonly deliveryTime: Temporal.PlainTime;
    readonly primaryMenuId: string;
    readonly alternativeMenuId: string | null;
    readonly isPublished: boolean;
}

export interface ScheduleChanges {
    readonly date?: Temporal.PlainDate | undefined;
    readonly deliveryTime?: Temporal.PlainTime | undefined;
    readonly primaryMenuId?: string | undefined;
    readonly alternativeMenuId?: string | null | undefined;
    readonly isPublished?: boolean | undefined;
}

export interface ScheduleUpdateRecord {
    readonly id: string;
    readonly changes: ScheduleChanges;
}

export interface ScheduleFilter {
    readonly ids?: readonly string[] | undefined;
    readonly packageId?: string | undefined;
    readonly from?: Temporal.PlainDate | undefined;
    readonly to?: Temporal.PlainDate | undefined;
    readonly deliveryTime?: Temporal.PlainTime | undefined;
    readonly isPublished?: boolean | undefined;
}

export interface ScheduleListQuery extends ScheduleFilter {
    readonly skip: number;
    readonly take: number;
}

export interface ScheduleListRecord {
    readonly items: readonly ScheduleRecord[];
    readonly total: number;
}

export type PublishTarget =
    | { readonly ids: readonly string[] }
    | { readonly packageId: string; readonly from: Temporal.PlainDate; readonly to: Temporal.PlainDate };

export interface CatalogRepository {
    findMissingAllergyIds(ids: readonly string[]): Promise<readonly string[]>;
    findAllergiesByIds(ids: readonly string[]): Promise<readonly AllergyRecord[]>;
    findAllAllergies(): Promise<readonly AllergyRecord[]>;
    listAllergies(query: AllergyListQuery): Promise<AllergyListRecord>;
    findAllergyById(id: string): Promise<AllergyRecord | null>;
    createAllergy(name: string): Promise<AllergyRecord>;
    updateAllergy(id: string, name: string): Promise<AllergyRecord | null>;
    deleteAllergy(id: string): Promise<boolean>;

    listPackages(query: PackageListQuery): Promise<PackageListRecord>;
    findPackageById(id: string): Promise<PackageRecord | null>;
    findPackagesByIds(ids: readonly string[]): Promise<readonly PackageRecord[]>;
    findAvailablePackages(at: Temporal.PlainDateTime): Promise<readonly PackageRecord[]>;
    findMissingPackageIds(ids: readonly string[]): Promise<readonly string[]>;
    createPackage(record: NewPackageRecord): Promise<PackageRecord>;
    updatePackage(id: string, changes: PackageChanges, options?: UpdatePackageOptions): Promise<PackageRecord | null>;
    deletePackage(id: string): Promise<boolean>;
    findScheduleIdsAtTimes(packageId: string, removed: RemovedMealTimes): Promise<readonly string[]>;

    listMenus(query: MenuListQuery): Promise<MenuListRecord>;
    findMenuById(id: string): Promise<MenuRecord | null>;
    findMenusByIds(ids: readonly string[]): Promise<readonly MenuRecord[]>;
    findMenuKinds(ids: readonly string[]): Promise<readonly MenuKindRecord[]>;
    createMenu(record: NewMenuRecord): Promise<MenuRecord>;
    updateMenu(id: string, changes: MenuChanges): Promise<MenuRecord | null>;
    deleteMenu(id: string): Promise<boolean>;
    findScheduleIdsUsingMenu(menuId: string, role?: ScheduleMenuRole): Promise<readonly string[]>;
    findRecipeLines(menuIds: readonly string[]): Promise<readonly RecipeLineRecord[]>;
    findMenusUsingIngredients(ingredientIds: readonly string[]): Promise<readonly MenuUsageRecord[]>;

    listSchedules(query: ScheduleListQuery): Promise<ScheduleListRecord>;
    findSchedules(filter: ScheduleFilter): Promise<readonly ScheduleRecord[]>;
    findScheduleById(id: string): Promise<ScheduleRecord | null>;
    findMissingScheduleIds(ids: readonly string[]): Promise<readonly string[]>;
    createSchedules(records: readonly NewScheduleRecord[]): Promise<readonly ScheduleRecord[]>;
    updateSchedules(updates: readonly ScheduleUpdateRecord[]): Promise<readonly ScheduleRecord[]>;
    deleteSchedules(ids: readonly string[]): Promise<number>;
    setSchedulesPublished(target: PublishTarget, isPublished: boolean): Promise<number>;
}

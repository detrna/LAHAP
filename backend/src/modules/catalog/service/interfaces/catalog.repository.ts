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

export interface UpdatePackageOptions {
    readonly deleteSchedulesAt?: RemovedMealTimes | undefined;
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
    findMissingPackageIds(ids: readonly string[]): Promise<readonly string[]>;
    createPackage(record: NewPackageRecord): Promise<PackageRecord>;
    updatePackage(id: string, changes: PackageChanges, options?: UpdatePackageOptions): Promise<PackageRecord | null>;
    deletePackage(id: string): Promise<boolean>;
    findScheduleIdsAtTimes(packageId: string, removed: RemovedMealTimes): Promise<readonly string[]>;
}

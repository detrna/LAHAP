export * from "../../domain/errors.js";

export interface AllergyRecord {
    readonly id: string;
    readonly name: string;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface CatalogRepository {
    findMissingAllergyIds(ids: readonly string[]): Promise<readonly string[]>;
    findAllergiesByIds(ids: readonly string[]): Promise<readonly AllergyRecord[]>;
}

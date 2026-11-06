import type { IngredientUnit } from "../../domain/ingredient.domain.js";

export * from "../../domain/errors.js";

export interface IngredientRecord {
    readonly id: string;
    readonly name: string;
    readonly unit: IngredientUnit;
    readonly stock: number;
    readonly minimumThreshold: number;
    readonly photoKey: string;
    readonly allergyIds: readonly string[];
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface NewIngredientRecord {
    readonly name: string;
    readonly unit: IngredientUnit;
    readonly stock: number;
    readonly minimumThreshold: number;
    readonly photoKey: string;
    readonly allergyIds: readonly string[];
}

export interface IngredientChanges {
    readonly name?: string | undefined;
    readonly unit?: IngredientUnit | undefined;
    readonly stock?: number | undefined;
    readonly minimumThreshold?: number | undefined;
    readonly photoKey?: string | undefined;
    readonly allergyIds?: readonly string[] | undefined;
}

export interface IngredientUpdateRecord {
    readonly id: string;
    readonly changes: IngredientChanges;
}

export interface IngredientListQuery {
    readonly search?: string | undefined;
    readonly lowStock?: boolean | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface IngredientListRecord {
    readonly items: readonly IngredientRecord[];
    readonly total: number;
}

export interface IngredientsRepository {
    list(query: IngredientListQuery): Promise<IngredientListRecord>;
    findById(id: string): Promise<IngredientRecord | null>;
    findByIds(ids: readonly string[]): Promise<readonly IngredientRecord[]>;
    findMissingIds(ids: readonly string[]): Promise<readonly string[]>;
    createMany(records: readonly NewIngredientRecord[]): Promise<readonly IngredientRecord[]>;
    updateMany(updates: readonly IngredientUpdateRecord[]): Promise<readonly IngredientRecord[]>;
    deleteMany(ids: readonly string[]): Promise<number>;
}

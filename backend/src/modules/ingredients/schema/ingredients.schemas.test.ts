import { describe, expect, it } from "vitest";
import {
    ingredientBatchCreateSchema,
    ingredientBatchDeleteSchema,
    ingredientBatchUpdateSchema,
    ingredientCreateSchema,
    ingredientIdParamsSchema,
    ingredientListQuerySchema,
    ingredientUpdateSchema,
    stockUpdateSchema,
} from "./ingredients.schemas.js";

const ID_A = "00000000-0000-4000-8000-000000000001";
const ID_B = "00000000-0000-4000-8000-000000000002";

const validIngredient = {
    name: "Dada Ayam",
    unit: "kg",
    photoKey: "ingredients/2026/11/3f2b6c1e.webp",
};

describe("ingredientCreateSchema", () => {
    it("accepts the required fields and leaves the optional ones out", () => {
        expect(ingredientCreateSchema.parse(validIngredient)).toEqual(validIngredient);
    });

    it("trims the name and requires 1 to 100 characters", () => {
        expect(ingredientCreateSchema.parse({ ...validIngredient, name: "  Bawang " }).name).toBe("Bawang");
        expect(ingredientCreateSchema.safeParse({ ...validIngredient, name: "   " }).success).toBe(false);
        expect(ingredientCreateSchema.safeParse({ ...validIngredient, name: "a".repeat(101) }).success).toBe(false);
    });

    it("rejects a unit outside the list", () => {
        expect(ingredientCreateSchema.safeParse({ ...validIngredient, unit: "pcs" }).success).toBe(false);
    });

    it("rounds the quantities to 2 decimals and rejects negative or out-of-range ones", () => {
        const parsed = ingredientCreateSchema.parse({ ...validIngredient, stock: 1.005, minimumThreshold: 0 });

        expect(parsed).toMatchObject({ stock: 1.01, minimumThreshold: 0 });
        expect(ingredientCreateSchema.safeParse({ ...validIngredient, stock: -1 }).success).toBe(false);
        expect(ingredientCreateSchema.safeParse({ ...validIngredient, minimumThreshold: -0.01 }).success).toBe(false);
        expect(ingredientCreateSchema.safeParse({ ...validIngredient, stock: 100000000 }).success).toBe(false);
    });

    it("only takes a photo key inside ingredients/", () => {
        expect(ingredientCreateSchema.safeParse({ ...validIngredient, photoKey: "menus/2026/11/a.webp" }).success).toBe(
            false,
        );
        expect(
            ingredientCreateSchema.safeParse({ ...validIngredient, photoKey: "https://x.test/a.webp" }).success,
        ).toBe(false);
        expect(ingredientCreateSchema.safeParse({ name: "x", unit: "kg" }).success).toBe(false);
    });

    it("takes unique allergy ids", () => {
        expect(ingredientCreateSchema.safeParse({ ...validIngredient, allergyIds: [ID_A, ID_B] }).success).toBe(true);
        expect(ingredientCreateSchema.safeParse({ ...validIngredient, allergyIds: [ID_A, ID_A] }).success).toBe(false);
        expect(ingredientCreateSchema.safeParse({ ...validIngredient, allergyIds: ["nope"] }).success).toBe(false);
    });
});

describe("ingredientUpdateSchema", () => {
    it("accepts any single field", () => {
        expect(ingredientUpdateSchema.parse({ stock: 3 })).toEqual({ stock: 3 });
        expect(ingredientUpdateSchema.parse({ allergyIds: [] })).toEqual({ allergyIds: [] });
    });

    it("requires at least one field", () => {
        expect(ingredientUpdateSchema.safeParse({}).success).toBe(false);
    });
});

describe("batch schemas", () => {
    it("takes 1 to 100 items to create", () => {
        expect(ingredientBatchCreateSchema.safeParse({ items: [] }).success).toBe(false);
        expect(ingredientBatchCreateSchema.safeParse({ items: [validIngredient] }).success).toBe(true);
        expect(
            ingredientBatchCreateSchema.safeParse({ items: Array.from({ length: 101 }, () => validIngredient) })
                .success,
        ).toBe(false);
    });

    it("needs an id and one change per item to update", () => {
        expect(ingredientBatchUpdateSchema.safeParse({ items: [{ id: ID_A, stock: 1 }] }).success).toBe(true);
        expect(ingredientBatchUpdateSchema.safeParse({ items: [{ id: ID_A }] }).success).toBe(false);
        expect(ingredientBatchUpdateSchema.safeParse({ items: [{ stock: 1 }] }).success).toBe(false);
        expect(ingredientBatchUpdateSchema.safeParse({ items: [] }).success).toBe(false);
    });

    it("rejects the same id twice in a batch update", () => {
        expect(
            ingredientBatchUpdateSchema.safeParse({
                items: [
                    { id: ID_A, stock: 1 },
                    { id: ID_A, stock: 2 },
                ],
            }).success,
        ).toBe(false);
    });

    it("takes 1 to 100 unique ids to delete", () => {
        expect(ingredientBatchDeleteSchema.safeParse({ ids: [ID_A, ID_B] }).success).toBe(true);
        expect(ingredientBatchDeleteSchema.safeParse({ ids: [] }).success).toBe(false);
        expect(ingredientBatchDeleteSchema.safeParse({ ids: [ID_A, ID_A] }).success).toBe(false);
        expect(ingredientBatchDeleteSchema.safeParse({ ids: ["nope"] }).success).toBe(false);
    });
});

describe("stockUpdateSchema", () => {
    it("requires a non-negative stock", () => {
        expect(stockUpdateSchema.parse({ stock: 0 })).toEqual({ stock: 0 });
        expect(stockUpdateSchema.safeParse({}).success).toBe(false);
        expect(stockUpdateSchema.safeParse({ stock: -1 }).success).toBe(false);
    });
});

describe("ingredientListQuerySchema", () => {
    it("reads page, limit, search and lowStock", () => {
        expect(ingredientListQuerySchema.parse({ search: " ayam ", lowStock: "true", page: "2", limit: "5" })).toEqual({
            search: "ayam",
            lowStock: true,
            page: 2,
            limit: 5,
        });
    });

    it("reads lowStock=false as false, not true", () => {
        expect(ingredientListQuerySchema.parse({ lowStock: "false" }).lowStock).toBe(false);
        expect(ingredientListQuerySchema.parse({}).lowStock).toBeUndefined();
    });

    it("treats an empty search as no filter", () => {
        expect(ingredientListQuerySchema.parse({ search: "" }).search).toBeUndefined();
    });
});

describe("ingredientIdParamsSchema", () => {
    it("requires a uuid", () => {
        expect(ingredientIdParamsSchema.safeParse({ id: ID_A }).success).toBe(true);
        expect(ingredientIdParamsSchema.safeParse({ id: "shopping-list" }).success).toBe(false);
    });
});

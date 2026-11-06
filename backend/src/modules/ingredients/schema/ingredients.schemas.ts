import { z } from "zod";
import { paginationQuerySchema } from "../../../shared/pagination/index.js";
import { decimalSchema } from "../../../shared/schema/decimal.js";
import { photoKeyIn } from "../../../shared/schema/photo-key.js";
import { queryBooleanSchema } from "../../../shared/schema/query-boolean.js";
import { searchQuerySchema } from "../../../shared/schema/search.js";
import { uniqueArray } from "../../../shared/schema/unique-array.js";
import { isoDateSchema } from "../../../shared/time/schemas.js";
import { INGREDIENT_UNITS } from "../domain/ingredient.domain.js";

export const MAX_BATCH_SIZE = 100;

export const ingredientIdParamsSchema = z.object({
    id: z.uuid(),
});

const quantitySchema = decimalSchema({ scale: 2, min: 0, max: 99999999.99 });

const ingredientShape = {
    name: z.string().trim().min(1).max(100),
    unit: z.enum(INGREDIENT_UNITS),
    stock: quantitySchema,
    minimumThreshold: quantitySchema,
    photoKey: photoKeyIn("ingredients"),
    allergyIds: uniqueArray(z.uuid()),
};

export const ingredientCreateSchema = z.object({
    name: ingredientShape.name,
    unit: ingredientShape.unit,
    photoKey: ingredientShape.photoKey,
    stock: ingredientShape.stock.optional(),
    minimumThreshold: ingredientShape.minimumThreshold.optional(),
    allergyIds: ingredientShape.allergyIds.optional(),
});

const updateFields = {
    name: ingredientShape.name.optional(),
    unit: ingredientShape.unit.optional(),
    stock: ingredientShape.stock.optional(),
    minimumThreshold: ingredientShape.minimumThreshold.optional(),
    photoKey: ingredientShape.photoKey.optional(),
    allergyIds: ingredientShape.allergyIds.optional(),
};

const MUST_CHANGE_MESSAGE = "must change at least one field";

export const ingredientUpdateSchema = z
    .object(updateFields)
    .refine(value => Object.values(value).some(field => field !== undefined), {
        path: [],
        message: MUST_CHANGE_MESSAGE,
    });

export const ingredientBatchUpdateItemSchema = z
    .object({ id: z.uuid(), ...updateFields })
    .refine(({ id: _id, ...changes }) => Object.values(changes).some(field => field !== undefined), {
        path: [],
        message: MUST_CHANGE_MESSAGE,
    });

export const ingredientBatchCreateSchema = z.object({
    items: z.array(ingredientCreateSchema).min(1).max(MAX_BATCH_SIZE),
});

export const ingredientBatchUpdateSchema = z.object({
    items: uniqueArray(ingredientBatchUpdateItemSchema, { by: item => item.id })
        .min(1)
        .max(MAX_BATCH_SIZE),
});

export const ingredientBatchDeleteSchema = z.object({
    ids: uniqueArray(z.uuid()).min(1).max(MAX_BATCH_SIZE),
});

export const stockUpdateSchema = z.object({
    stock: quantitySchema,
});

export const ingredientListQuerySchema = paginationQuerySchema.extend({
    search: searchQuerySchema,
    lowStock: queryBooleanSchema.optional(),
});

export const shoppingListQuerySchema = z.object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
});

export type IngredientIdParams = z.output<typeof ingredientIdParamsSchema>;
export type IngredientCreateBody = z.output<typeof ingredientCreateSchema>;
export type IngredientUpdateBody = z.output<typeof ingredientUpdateSchema>;
export type IngredientBatchCreateBody = z.output<typeof ingredientBatchCreateSchema>;
export type IngredientBatchUpdateBody = z.output<typeof ingredientBatchUpdateSchema>;
export type IngredientBatchDeleteBody = z.output<typeof ingredientBatchDeleteSchema>;
export type StockUpdateBody = z.output<typeof stockUpdateSchema>;
export type IngredientListQuery = z.output<typeof ingredientListQuerySchema>;
export type ShoppingListQuery = z.output<typeof shoppingListQuerySchema>;

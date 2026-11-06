import { z } from "zod";
import { paginationQuerySchema } from "../../../shared/pagination/index.js";
import { decimalSchema } from "../../../shared/schema/decimal.js";
import { photoKeyIn } from "../../../shared/schema/photo-key.js";
import { queryBooleanSchema } from "../../../shared/schema/query-boolean.js";
import { searchQuerySchema } from "../../../shared/schema/search.js";
import { uniqueArray } from "../../../shared/schema/unique-array.js";
import { isoTimestampSchema } from "../../../shared/time/schemas.js";
import { clockTimeSchema } from "../../../shared/utils/meal-time/meal-time.js";
import { ORDER_PERIODS } from "../domain/package.domain.js";

export const allergyIdParamsSchema = z.object({
    id: z.uuid(),
});

export const menuIdParamsSchema = z.object({
    id: z.uuid(),
});

export const packageIdParamsSchema = z.object({
    id: z.uuid(),
});

export const menuScheduleIdParamsSchema = z.object({
    id: z.uuid(),
});

const allergyNameSchema = z.string().trim().min(1).max(50);

export const allergyCreateSchema = z.object({
    name: allergyNameSchema,
});

export const allergyUpdateSchema = z.object({
    name: allergyNameSchema,
});

export const allergyListQuerySchema = paginationQuerySchema.extend({
    search: searchQuerySchema,
});

const deliveryRadiusSchema = decimalSchema({ scale: 2, min: 0, max: 999.99 });
const deliveryPricePerKmSchema = decimalSchema({ scale: 2, min: 0, max: 99999999.99 });

const packageShape = {
    name: z.string().trim().min(1).max(100),
    description: z.string().trim(),
    basePrice: decimalSchema({ scale: 2, min: 0, exclusiveMin: true, max: 9999999999.99 }),
    periods: uniqueArray(z.enum(ORDER_PERIODS)).min(1),
    deliveryTimes: uniqueArray(clockTimeSchema, { by: time => time.toString() }).min(1),
    deliveryFreeRadius: deliveryRadiusSchema.nullable(),
    deliveryMaxDistance: deliveryRadiusSchema.nullable(),
    deliveryPricePerKm: deliveryPricePerKmSchema.nullable(),
    photoKey: photoKeyIn("packages"),
    startAt: isoTimestampSchema,
    endAt: isoTimestampSchema.nullable(),
    isActive: z.boolean(),
};

export const packageCreateSchema = z.object({
    name: packageShape.name,
    description: packageShape.description,
    basePrice: packageShape.basePrice,
    periods: packageShape.periods,
    deliveryTimes: packageShape.deliveryTimes,
    photoKey: packageShape.photoKey,
    deliveryFreeRadius: packageShape.deliveryFreeRadius.optional(),
    deliveryMaxDistance: packageShape.deliveryMaxDistance.optional(),
    deliveryPricePerKm: packageShape.deliveryPricePerKm.optional(),
    startAt: packageShape.startAt.optional(),
    endAt: packageShape.endAt.optional(),
    isActive: packageShape.isActive.optional(),
});

export const packageUpdateSchema = z
    .object({
        name: packageShape.name.optional(),
        description: packageShape.description.optional(),
        basePrice: packageShape.basePrice.optional(),
        periods: packageShape.periods.optional(),
        deliveryTimes: packageShape.deliveryTimes.optional(),
        deliveryFreeRadius: packageShape.deliveryFreeRadius.optional(),
        deliveryMaxDistance: packageShape.deliveryMaxDistance.optional(),
        deliveryPricePerKm: packageShape.deliveryPricePerKm.optional(),
        photoKey: packageShape.photoKey.optional(),
        startAt: packageShape.startAt.optional(),
        endAt: packageShape.endAt.optional(),
        isActive: packageShape.isActive.optional(),
    })
    .refine(value => Object.values(value).some(field => field !== undefined), {
        path: [],
        message: "must change at least one field",
    });

export const packageListQuerySchema = paginationQuerySchema.extend({
    search: searchQuerySchema,
    isActive: queryBooleanSchema.optional(),
});

export const availablePackageListQuerySchema = paginationQuerySchema.extend({
    search: searchQuerySchema,
});

export type AllergyIdParams = z.output<typeof allergyIdParamsSchema>;
export type AllergyCreateBody = z.output<typeof allergyCreateSchema>;
export type AllergyUpdateBody = z.output<typeof allergyUpdateSchema>;
export type AllergyListQuery = z.output<typeof allergyListQuerySchema>;
export type PackageIdParams = z.output<typeof packageIdParamsSchema>;
export type PackageCreateBody = z.output<typeof packageCreateSchema>;
export type PackageUpdateBody = z.output<typeof packageUpdateSchema>;
export type PackageListQuery = z.output<typeof packageListQuerySchema>;
export type AvailablePackageListQuery = z.output<typeof availablePackageListQuerySchema>;

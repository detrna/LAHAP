import { z } from "zod";
import { paginationQuerySchema } from "../../../shared/pagination/index.js";
import { decimalSchema } from "../../../shared/schema/decimal.js";
import { photoKeyIn } from "../../../shared/schema/photo-key.js";
import { queryBooleanSchema } from "../../../shared/schema/query-boolean.js";
import { searchQuerySchema } from "../../../shared/schema/search.js";
import { uniqueArray } from "../../../shared/schema/unique-array.js";
import { isoDateSchema, isoTimestampSchema } from "../../../shared/time/schemas.js";
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

const mealTimeKey = (time: Temporal.PlainTime) => time.toString({ smallestUnit: "minute" });

const deliveryTimeChangesSchema = uniqueArray(z.object({ from: clockTimeSchema, to: clockTimeSchema }), {
    by: change => mealTimeKey(change.from),
})
    .min(1)
    .refine(changes => new Set(changes.map(change => mealTimeKey(change.to))).size === changes.length, {
        message: "must not move two times to the same time",
    });

const changeReasonSchema = z.string().trim().min(1).max(500);

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
        deliveryTimeChanges: deliveryTimeChangesSchema.optional(),
        changeReason: changeReasonSchema.optional(),
    })
    .refine(value => Object.values(value).some(field => field !== undefined), {
        path: [],
        message: "must change at least one field",
    })
    .refine(value => value.deliveryTimes === undefined || value.deliveryTimeChanges === undefined, {
        path: ["deliveryTimeChanges"],
        message: "cannot be sent together with deliveryTimes",
    });

export const packageListQuerySchema = paginationQuerySchema.extend({
    search: searchQuerySchema,
    isActive: queryBooleanSchema.optional(),
});

export const availablePackageListQuerySchema = paginationQuerySchema.extend({
    search: searchQuerySchema,
});

const MAX_BATCH_SIZE = 100;
const MUST_CHANGE_MESSAGE = "must change at least one field";
const hasChanges = (value: Record<string, unknown>) => Object.values(value).some(field => field !== undefined);

const menuIngredientInputSchema = z.object({
    ingredientId: z.uuid(),
    quantityPerPortion: decimalSchema({ scale: 2, min: 0, exclusiveMin: true, max: 99999999.99 }),
});

const menuShape = {
    name: z.string().trim().min(1).max(100),
    description: z.string().trim(),
    isAlternative: z.boolean(),
    tags: z.array(z.string().trim().min(1)),
    photoKey: photoKeyIn("menus"),
    ingredients: uniqueArray(menuIngredientInputSchema, { by: line => line.ingredientId }).min(1),
};

export const menuCreateSchema = z.object({
    name: menuShape.name,
    description: menuShape.description,
    isAlternative: menuShape.isAlternative.optional(),
    tags: menuShape.tags.optional(),
    photoKey: menuShape.photoKey,
    ingredients: menuShape.ingredients,
});

export const menuUpdateSchema = z
    .object({
        name: menuShape.name.optional(),
        description: menuShape.description.optional(),
        isAlternative: menuShape.isAlternative.optional(),
        tags: menuShape.tags.optional(),
        photoKey: menuShape.photoKey.optional(),
        ingredients: menuShape.ingredients.optional(),
        changeReason: changeReasonSchema.optional(),
    })
    .refine(({ changeReason: _changeReason, ...changes }) => hasChanges(changes), {
        path: [],
        message: MUST_CHANGE_MESSAGE,
    });

export const menuListQuerySchema = paginationQuerySchema.extend({
    search: searchQuerySchema,
    isAlternative: queryBooleanSchema.optional(),
});

const scheduleUpdateFields = {
    date: isoDateSchema.optional(),
    deliveryTime: clockTimeSchema.optional(),
    primaryMenuId: z.uuid().optional(),
    alternativeMenuId: z.uuid().nullable().optional(),
    isPublished: z.boolean().optional(),
    changeReason: changeReasonSchema.optional(),
};

const hasScheduleChanges = ({ changeReason: _changeReason, ...changes }: Record<string, unknown>) =>
    hasChanges(changes);

export const menuScheduleCreateSchema = z.object({
    packageId: z.uuid(),
    date: isoDateSchema,
    deliveryTime: clockTimeSchema,
    primaryMenuId: z.uuid(),
    alternativeMenuId: z.uuid().nullable().optional(),
    isPublished: z.boolean().optional(),
});

export const menuScheduleBatchCreateSchema = z.object({
    items: z.array(menuScheduleCreateSchema).min(1).max(MAX_BATCH_SIZE),
});

export const menuScheduleUpdateSchema = z
    .object(scheduleUpdateFields)
    .refine(hasScheduleChanges, { path: [], message: MUST_CHANGE_MESSAGE });

export const menuScheduleBatchUpdateSchema = z.object({
    items: uniqueArray(
        z
            .object({ id: z.uuid(), ...scheduleUpdateFields })
            .refine(({ id: _id, ...changes }) => hasScheduleChanges(changes), {
                path: [],
                message: MUST_CHANGE_MESSAGE,
            }),
        { by: item => item.id },
    )
        .min(1)
        .max(MAX_BATCH_SIZE),
});

export const menuScheduleBatchDeleteSchema = z.object({
    ids: uniqueArray(z.uuid()).min(1).max(MAX_BATCH_SIZE),
});

const isOrdered = (from: Temporal.PlainDate | undefined, to: Temporal.PlainDate | undefined) =>
    from === undefined || to === undefined || Temporal.PlainDate.compare(from, to) <= 0;

export const publishMenuSchedulesSchema = z
    .object({
        ids: uniqueArray(z.uuid()).min(1).max(MAX_BATCH_SIZE).optional(),
        packageId: z.uuid().optional(),
        from: isoDateSchema.optional(),
        to: isoDateSchema.optional(),
        publish: z.boolean().default(true),
    })
    .superRefine((value, ctx) => {
        const byRange = value.packageId !== undefined || value.from !== undefined || value.to !== undefined;
        if (value.ids !== undefined && byRange) {
            ctx.addIssue({ code: "custom", path: ["ids"], message: "send either ids or packageId with from and to" });
            return;
        }
        if (value.ids !== undefined) return;
        for (const field of ["packageId", "from", "to"] as const) {
            if (value[field] === undefined) ctx.addIssue({ code: "custom", path: [field], message: "is required" });
        }
        if (!isOrdered(value.from, value.to)) {
            ctx.addIssue({ code: "custom", path: ["to"], message: "must not be before from" });
        }
    })
    .transform(value =>
        value.ids !== undefined
            ? { ids: value.ids, publish: value.publish }
            : {
                  packageId: value.packageId as string,
                  from: value.from as Temporal.PlainDate,
                  to: value.to as Temporal.PlainDate,
                  publish: value.publish,
              },
    );

export const menuScheduleListQuerySchema = paginationQuerySchema
    .extend({
        packageId: z.uuid().optional(),
        from: isoDateSchema.optional(),
        to: isoDateSchema.optional(),
        isPublished: queryBooleanSchema.optional(),
    })
    .refine(value => isOrdered(value.from, value.to), { path: ["to"], message: "must not be before from" });

export const packageScheduleQuerySchema = z.object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
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
export type MenuIdParams = z.output<typeof menuIdParamsSchema>;
export type MenuCreateBody = z.output<typeof menuCreateSchema>;
export type MenuUpdateBody = z.output<typeof menuUpdateSchema>;
export type MenuListQuery = z.output<typeof menuListQuerySchema>;
export type MenuScheduleIdParams = z.output<typeof menuScheduleIdParamsSchema>;
export type MenuScheduleBatchCreateBody = z.output<typeof menuScheduleBatchCreateSchema>;
export type MenuScheduleUpdateBody = z.output<typeof menuScheduleUpdateSchema>;
export type MenuScheduleBatchUpdateBody = z.output<typeof menuScheduleBatchUpdateSchema>;
export type MenuScheduleBatchDeleteBody = z.output<typeof menuScheduleBatchDeleteSchema>;
export type PublishMenuSchedulesBody = z.output<typeof publishMenuSchedulesSchema>;
export type MenuScheduleListQuery = z.output<typeof menuScheduleListQuerySchema>;
export type PackageScheduleQuery = z.output<typeof packageScheduleQuerySchema>;

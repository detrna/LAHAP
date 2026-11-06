import { z } from "zod";
import { paginationQuerySchema } from "../../../shared/pagination/index.js";
import { decimalSchema } from "../../../shared/schema/decimal.js";
import { photoKeyIn } from "../../../shared/schema/photo-key.js";

export const MAX_DURATION_DAYS = 3650;
export const MAX_REQUIRED_SUBSCRIPTION_DAYS = 2147483647;

export const tierIdParamsSchema = z.object({
    id: z.uuid(),
});

const tierShape = {
    name: z.string().trim().min(1).max(50),
    description: z.string().nullable(),
    requiredSubscriptionDays: z.number().int().min(0).max(MAX_REQUIRED_SUBSCRIPTION_DAYS),
    durationDays: z.number().int().min(1).max(MAX_DURATION_DAYS),
    discountPercent: decimalSchema({ scale: 2, min: 0, max: 100 }),
    photoKey: photoKeyIn("tiers").nullable(),
};

export const tierCreateSchema = z.object({
    name: tierShape.name,
    requiredSubscriptionDays: tierShape.requiredSubscriptionDays,
    discountPercent: tierShape.discountPercent,
    description: tierShape.description.optional(),
    durationDays: tierShape.durationDays.optional(),
    photoKey: tierShape.photoKey.optional(),
});

export const tierUpdateSchema = z
    .object({
        name: tierShape.name.optional(),
        description: tierShape.description.optional(),
        requiredSubscriptionDays: tierShape.requiredSubscriptionDays.optional(),
        durationDays: tierShape.durationDays.optional(),
        discountPercent: tierShape.discountPercent.optional(),
        photoKey: tierShape.photoKey.optional(),
    })
    .refine(value => Object.values(value).some(field => field !== undefined), {
        path: [],
        message: "must change at least one field",
    });

export const tierListQuerySchema = paginationQuerySchema;

export type TierIdParams = z.output<typeof tierIdParamsSchema>;
export type TierCreateBody = z.output<typeof tierCreateSchema>;
export type TierUpdateBody = z.output<typeof tierUpdateSchema>;
export type TierListQuery = z.output<typeof tierListQuerySchema>;

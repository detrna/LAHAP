import { z } from "zod";
import { paginationQuerySchema } from "../../../shared/pagination/index.js";
import { searchQuerySchema } from "../../../shared/schema/search.js";
import {
    findUnknownPlaceholders,
    MESSAGE_PLACEHOLDERS,
} from "../../../shared/utils/message-template/message-template.js";

export const MAX_TEMPLATE_NAME_LENGTH = 100;
export const MAX_TEMPLATE_BODY_LENGTH = 2000;

const ALLOWED_PLACEHOLDERS = Object.values(MESSAGE_PLACEHOLDERS).join(", ");

export const messageTemplateIdParamsSchema = z.object({
    id: z.uuid(),
});

export const churnUserIdParamsSchema = z.object({
    userId: z.uuid(),
});

const templateNameSchema = z.string().trim().min(1).max(MAX_TEMPLATE_NAME_LENGTH);

const templateBodySchema = z
    .string()
    .trim()
    .min(1)
    .max(MAX_TEMPLATE_BODY_LENGTH)
    .superRefine((body, context) => {
        const unknown = findUnknownPlaceholders(body);
        if (unknown.length === 0) return;
        context.addIssue({
            code: "custom",
            message: `unknown placeholders ${unknown.join(", ")}; allowed: ${ALLOWED_PLACEHOLDERS}`,
        });
    });

export const messageTemplateCreateSchema = z.object({
    name: templateNameSchema,
    body: templateBodySchema,
});

export const messageTemplateUpdateSchema = z
    .object({
        name: templateNameSchema.optional(),
        body: templateBodySchema.optional(),
    })
    .refine(value => Object.values(value).some(field => field !== undefined), {
        path: [],
        message: "must change at least one field",
    });

export const messageTemplateListQuerySchema = paginationQuerySchema;

export const churnListQuerySchema = paginationQuerySchema.extend({
    search: searchQuerySchema,
});

export const MAX_PROMO_CODE_LENGTH = 50;

export const churnFollowUpSchema = z
    .object({
        templateId: z.uuid(),
        promoCode: z.string().trim().max(MAX_PROMO_CODE_LENGTH).nullable().optional(),
    })
    .transform(({ templateId, promoCode }) => ({
        templateId,
        ...(promoCode !== undefined && promoCode !== null && promoCode !== "" ? { promoCode } : {}),
    }));

export type ChurnFollowUpBody = z.output<typeof churnFollowUpSchema>;
export type ChurnListQuery = z.output<typeof churnListQuerySchema>;
export type MessageTemplateIdParams = z.output<typeof messageTemplateIdParamsSchema>;
export type ChurnUserIdParams = z.output<typeof churnUserIdParamsSchema>;
export type MessageTemplateCreateBody = z.output<typeof messageTemplateCreateSchema>;
export type MessageTemplateUpdateBody = z.output<typeof messageTemplateUpdateSchema>;

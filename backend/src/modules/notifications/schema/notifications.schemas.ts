import { z } from "zod";
import { paginationQuerySchema } from "../../../shared/pagination/index.js";
import { queryBooleanSchema } from "../../../shared/schema/query-boolean.js";
import { ANNOUNCEMENT_SCOPES } from "../domain/announcement.domain.js";

export const MAX_TITLE_LENGTH = 150;
export const MAX_BODY_LENGTH = 2000;

export const notificationIdParamsSchema = z.object({
    id: z.uuid(),
});

export const announcementIdParamsSchema = z.object({
    id: z.uuid(),
});

const titleSchema = z.string().trim().min(1).max(MAX_TITLE_LENGTH);
const bodySchema = z.string().trim().min(1).max(MAX_BODY_LENGTH);

export const notificationListQuerySchema = paginationQuerySchema.extend({
    isRead: queryBooleanSchema.optional(),
});

export const myAnnouncementListQuerySchema = paginationQuerySchema;

export const announcementListQuerySchema = paginationQuerySchema.extend({
    scope: z.enum(ANNOUNCEMENT_SCOPES).optional(),
    packageId: z.uuid().optional(),
});

export const broadcastSchema = z.discriminatedUnion("target", [
    z.strictObject({ target: z.literal("GLOBAL"), title: titleSchema, body: bodySchema }),
    z.strictObject({ target: z.literal("PACKAGE"), title: titleSchema, body: bodySchema, packageId: z.uuid() }),
    z.strictObject({ target: z.literal("SCHEDULE"), title: titleSchema, body: bodySchema, menuScheduleId: z.uuid() }),
    z.strictObject({ target: z.literal("CUSTOMER"), title: titleSchema, body: bodySchema, userId: z.uuid() }),
]);

export const announcementUpdateSchema = z
    .object({
        title: titleSchema.optional(),
        body: bodySchema.optional(),
        scope: z.enum(ANNOUNCEMENT_SCOPES).optional(),
        packageId: z.uuid().nullable().optional(),
        menuScheduleId: z.uuid().nullable().optional(),
    })
    .refine(value => Object.values(value).some(field => field !== undefined), {
        path: [],
        message: "must change at least one field",
    });

export type NotificationIdParams = z.output<typeof notificationIdParamsSchema>;
export type AnnouncementIdParams = z.output<typeof announcementIdParamsSchema>;
export type NotificationListQuery = z.output<typeof notificationListQuerySchema>;
export type AnnouncementListQuery = z.output<typeof announcementListQuerySchema>;
export type BroadcastBody = z.output<typeof broadcastSchema>;
export type AnnouncementUpdateBody = z.output<typeof announcementUpdateSchema>;

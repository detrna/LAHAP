import { z } from "zod";

export const notificationIdParamsSchema = z.object({
    id: z.uuid(),
});

export const announcementIdParamsSchema = z.object({
    id: z.uuid(),
});

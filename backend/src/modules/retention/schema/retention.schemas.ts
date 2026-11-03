import { z } from "zod";

export const messageTemplateIdParamsSchema = z.object({
    id: z.uuid(),
});

export const churnUserIdParamsSchema = z.object({
    userId: z.uuid(),
});

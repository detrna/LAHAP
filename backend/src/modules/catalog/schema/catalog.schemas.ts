import { z } from "zod";

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

import { z } from "zod";

export const subscriptionIdParamsSchema = z.object({
    id: z.uuid(),
});

export const orderIdParamsSchema = z.object({
    id: z.uuid(),
});

export const paymentIdParamsSchema = z.object({
    id: z.uuid(),
});

import { z } from "zod";
import { photoKeyIn } from "../../../shared/schema/photo-key.js";
import { isoDateSchema } from "../../../shared/time/schemas.js";

export const OBSTACLE_NOTE_MAX_LENGTH = 1000;

export const orderIdParamsSchema = z.object({
    id: z.uuid(),
});

export const deliveryListQuerySchema = z.object({
    date: isoDateSchema.optional(),
});

export const obstacleCreateSchema = z.object({
    note: z.string().trim().min(1).max(OBSTACLE_NOTE_MAX_LENGTH),
    photoKey: photoKeyIn("obstacles").optional(),
});

export type DeliveryListQuery = z.output<typeof deliveryListQuerySchema>;
export type ObstacleCreate = z.output<typeof obstacleCreateSchema>;

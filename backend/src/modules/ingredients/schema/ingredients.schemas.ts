import { z } from "zod";

export const ingredientIdParamsSchema = z.object({
    id: z.uuid(),
});

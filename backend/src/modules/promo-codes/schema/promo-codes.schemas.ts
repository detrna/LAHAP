import { z } from "zod";

export const promoCodeIdParamsSchema = z.object({
    id: z.uuid(),
});

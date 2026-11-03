import { z } from "zod";

export const tierIdParamsSchema = z.object({
    id: z.uuid(),
});

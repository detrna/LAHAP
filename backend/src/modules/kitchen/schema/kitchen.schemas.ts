import { z } from "zod";
import { isoDateSchema } from "../../../shared/time/schemas.js";
import { clockTimeSchema } from "../../../shared/utils/meal-time/meal-time.js";

export const toCookQuerySchema = z.object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    deliveryTime: clockTimeSchema.optional(),
    packageId: z.uuid().optional(),
});

export type ToCookQuery = z.output<typeof toCookQuerySchema>;

import { z } from "zod";

// Request schemas mirror docs/api/openapi.json (UserCreate, UserUpdate, ProfileUpdate, …).
export const userIdParamsSchema = z.object({
    id: z.uuid(),
});

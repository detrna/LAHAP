import { z } from "zod";
import { ROLES } from "../../../shared/auth/roles.js";
import { REALTIME_EVENTS } from "../domain/realtime-event.domain.js";

export const realtimeEnvelopeSchema = z.object({
    audience: z.object({
        userIds: z.array(z.string()).optional(),
        roles: z.array(z.enum(ROLES)).optional(),
    }),
    event: z.object({
        event: z.enum(REALTIME_EVENTS),
        data: z.unknown(),
    }),
});

export type RealtimeEnvelope = z.output<typeof realtimeEnvelopeSchema>;

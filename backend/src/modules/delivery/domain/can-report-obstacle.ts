import type { Role } from "../../../shared/auth/roles.js";
import type { ObstacleSlot } from "./courier-source.js";

export type ObstacleAccess =
    | { readonly kind: "allowed" }
    | { readonly kind: "not-found" }
    | { readonly kind: "refused"; readonly reason: string };

export interface ObstacleReporter {
    readonly role: Role;
    readonly userId: string;
    readonly slot: ObstacleSlot;
}

const ALLOWED: ObstacleAccess = { kind: "allowed" };
const NOT_FOUND: ObstacleAccess = { kind: "not-found" };

export function canReportObstacle({ role, userId, slot }: ObstacleReporter): ObstacleAccess {
    if (!slot.isDelivery || slot.subscriptionStatus !== "Success") return NOT_FOUND;
    if (role === "COURIER") {
        if (slot.courierId !== userId) return NOT_FOUND;
        return slot.status === "Diantar" ? ALLOWED : { kind: "refused", reason: "slot is not out for delivery" };
    }
    if (role === "ADMIN") {
        return slot.status === "Selesai" || slot.status === "Dilewati"
            ? { kind: "refused", reason: "slot is already finished or skipped" }
            : ALLOWED;
    }
    return NOT_FOUND;
}

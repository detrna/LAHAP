import type { Role } from "../../../shared/auth/roles.js";

export const LAST_ACTIVE_ADMIN_MESSAGE = "at least one active admin is required";

export interface AdminAccessState {
    readonly role: Role;
    readonly isActive: boolean;
}

export interface AdminAccessChanges {
    readonly role?: Role | undefined;
    readonly isActive?: boolean | undefined;
}

export function removesAdminAccess(current: AdminAccessState, changes: AdminAccessChanges): boolean {
    if (current.role !== "ADMIN" || !current.isActive) return false;
    return (changes.role !== undefined && changes.role !== "ADMIN") || changes.isActive === false;
}

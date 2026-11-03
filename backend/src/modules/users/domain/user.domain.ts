import type { Role } from "../../../shared/auth/roles.js";
import type { Allergy } from "../../catalog/domain/allergy.domain.js";
import type { Membership } from "../../tiers/domain/membership.domain.js";

export interface UserSummary {
    readonly id: string;
    readonly name: string;
    readonly phone: string;
    readonly role: Role;
}

export interface User {
    readonly id: string;
    readonly name: string;
    readonly email?: string | null | undefined;
    readonly phone: string;
    readonly role: Role;
    readonly address?: string | null | undefined;
    readonly latitude?: number | null | undefined;
    readonly longitude?: number | null | undefined;
    readonly allergyNote?: string | null | undefined;
    readonly isActive: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly membership?: Membership | null | undefined;
    readonly allergies?: readonly Allergy[] | undefined;
    readonly isChurned?: boolean | undefined;
}

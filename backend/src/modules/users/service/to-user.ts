import { toIsoTimestamp } from "../../../shared/time/timestamp.js";
import type { Allergy } from "../../catalog/domain/allergy.domain.js";
import type { Membership } from "../../tiers/domain/membership.domain.js";
import type { User } from "../domain/user.domain.js";
import type { UserRecord } from "./interfaces/users.repository.js";

export interface UserExtras {
    readonly allergies: readonly Allergy[];
    readonly membership?: Membership | null | undefined;
    readonly isChurned?: boolean | undefined;
}

export function toUser(record: UserRecord, extras: UserExtras): User {
    return {
        id: record.id,
        name: record.name,
        email: record.email,
        phone: record.phone,
        role: record.role,
        address: record.address,
        latitude: record.latitude,
        longitude: record.longitude,
        allergyNote: record.allergyNote,
        isActive: record.isActive,
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
        ...(extras.membership !== undefined ? { membership: extras.membership } : {}),
        allergies: extras.allergies,
        ...(extras.isChurned !== undefined ? { isChurned: extras.isChurned } : {}),
    };
}

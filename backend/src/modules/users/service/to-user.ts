import { toIsoTimestamp } from "../../../shared/time/timestamp.js";
import type { User } from "../domain/user.domain.js";
import type { UserRecord } from "./interfaces/users.repository.js";

export function toUser(record: UserRecord): User {
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
        allergies: record.allergies.map(allergy => ({
            id: allergy.id,
            name: allergy.name,
            createdAt: toIsoTimestamp(allergy.createdAt),
            updatedAt: toIsoTimestamp(allergy.updatedAt),
        })),
    };
}

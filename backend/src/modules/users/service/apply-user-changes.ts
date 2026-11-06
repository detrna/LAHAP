import type { Role } from "../../../shared/auth/roles.js";
import { removesAdminAccess } from "../domain/admin-access.js";
import type { UserChanges, UserRecord } from "./interfaces/users.repository.js";
import { UserAlreadyExistsError, UserNotFoundError } from "./interfaces/users.repository.js";
import { ensureKnownAllergies } from "./known-allergies.js";
import { blankToNull, normalizeEmail } from "./normalize.js";
import type { UsersService } from "./users.service.js";

export interface ProfileChangesInput {
    readonly name?: string | undefined;
    readonly email?: string | null | undefined;
    readonly phone?: string | undefined;
    readonly address?: string | null | undefined;
    readonly latitude?: number | null | undefined;
    readonly longitude?: number | null | undefined;
    readonly allergyIds?: readonly string[] | undefined;
    readonly allergyNote?: string | null | undefined;
}

export interface UserChangesInput extends ProfileChangesInput {
    readonly password?: string | undefined;
    readonly role?: Role | undefined;
    readonly isActive?: boolean | undefined;
}

export async function applyUserChanges(this: UsersService, id: string, input: UserChangesInput): Promise<UserRecord> {
    const current = await this.usersRepository.findById(id);
    if (current === null) throw new UserNotFoundError(id);

    const email = input.email === undefined ? undefined : normalizeEmail(input.email);
    const conflict = await this.usersRepository.findConflict({
        exceptId: id,
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(email !== undefined && email !== null ? { email } : {}),
    });
    if (conflict !== null) throw new UserAlreadyExistsError(conflict);
    if (input.allergyIds !== undefined) await ensureKnownAllergies(this.allergyLookup, input.allergyIds);

    const changes: UserChanges = {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.password !== undefined ? { passwordHash: await this.hasher.hash(input.password) } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.address !== undefined ? { address: blankToNull(input.address) } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.allergyNote !== undefined ? { allergyNote: blankToNull(input.allergyNote) } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };
    const record = await this.usersRepository.update(id, changes, {
        ...(input.allergyIds !== undefined ? { allergyIds: [...new Set(input.allergyIds)] } : {}),
        ensureActiveAdminRemains: removesAdminAccess(current, input),
    });
    if (record === null) throw new UserNotFoundError(id);
    return record;
}

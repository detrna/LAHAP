import type { Role } from "../../../shared/auth/roles.js";
import type { User } from "../domain/user.domain.js";
import { UserAlreadyExistsError } from "./interfaces/users.repository.js";
import { ensureKnownAllergies } from "./known-allergies.js";
import { blankToNull, normalizeEmail } from "./normalize.js";
import { toUser } from "./to-user.js";
import type { UsersService } from "./users.service.js";

export interface CreateUserInput {
    readonly phone: string;
    readonly password: string;
    readonly role: Role;
    readonly isActive?: boolean | undefined;
    readonly name?: string | undefined;
    readonly email?: string | undefined;
    readonly address?: string | undefined;
    readonly latitude?: number | undefined;
    readonly longitude?: number | undefined;
    readonly allergyIds?: readonly string[] | undefined;
    readonly allergyNote?: string | undefined;
}

export async function createUser(this: UsersService, input: CreateUserInput): Promise<User> {
    const email = normalizeEmail(input.email);
    const allergyIds = [...new Set(input.allergyIds ?? [])];

    if (await this.usersRepository.existsByPhone(input.phone)) {
        throw new UserAlreadyExistsError("phone");
    }
    if (email !== null && (await this.usersRepository.existsByEmail(email))) {
        throw new UserAlreadyExistsError("email");
    }
    await ensureKnownAllergies(this.usersRepository, allergyIds);

    const record = await this.usersRepository.create({
        name: blankToNull(input.name) ?? input.phone,
        email,
        phone: input.phone,
        passwordHash: await this.hasher.hash(input.password),
        role: input.role,
        address: blankToNull(input.address),
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        allergyNote: blankToNull(input.allergyNote),
        isActive: input.isActive ?? true,
        allergyIds,
    });
    return toUser(record);
}

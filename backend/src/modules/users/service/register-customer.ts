import type { User } from "../domain/user.domain.js";
import { UnknownAllergyError, UserAlreadyExistsError } from "./interfaces/users.repository.js";
import { toUser } from "./to-user.js";
import type { UsersService } from "./users.service.js";

export interface RegisterCustomerInput {
    readonly phone: string;
    readonly password: string;
    readonly name?: string | undefined;
    readonly email?: string | undefined;
    readonly address?: string | undefined;
    readonly latitude?: number | undefined;
    readonly longitude?: number | undefined;
    readonly allergyIds?: readonly string[] | undefined;
    readonly allergyNote?: string | undefined;
}

const blankToNull = (value: string | undefined): string | null => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

export async function registerCustomer(this: UsersService, input: RegisterCustomerInput): Promise<User> {
    const email = blankToNull(input.email)?.toLowerCase() ?? null;
    const allergyIds = [...new Set(input.allergyIds ?? [])];

    if (await this.usersRepository.existsByPhone(input.phone)) {
        throw new UserAlreadyExistsError("phone");
    }
    if (email !== null && (await this.usersRepository.existsByEmail(email))) {
        throw new UserAlreadyExistsError("email");
    }
    if (allergyIds.length > 0) {
        const missing = await this.usersRepository.findMissingAllergyIds(allergyIds);
        if (missing.length > 0) {
            throw new UnknownAllergyError(missing);
        }
    }

    const record = await this.usersRepository.create({
        name: blankToNull(input.name) ?? input.phone,
        email,
        phone: input.phone,
        passwordHash: await this.hasher.hash(input.password),
        role: "CUSTOMER",
        address: blankToNull(input.address),
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        allergyNote: blankToNull(input.allergyNote),
        allergyIds,
    });
    return toUser(record);
}

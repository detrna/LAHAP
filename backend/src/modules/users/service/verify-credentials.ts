import { randomUUID } from "node:crypto";
import { normalizePhone } from "../../../shared/utils/phone/phone.js";
import type { User } from "../domain/user.domain.js";
import type { UserCredentialsRecord } from "./interfaces/users.repository.js";
import type { UsersService } from "./users.service.js";

async function findCredentials(this: UsersService, identifier: string): Promise<UserCredentialsRecord | null> {
    const trimmed = identifier.trim();
    if (trimmed.includes("@")) {
        return this.usersRepository.findCredentialsByEmail(trimmed.toLowerCase());
    }

    let phone: string;
    try {
        phone = normalizePhone(trimmed);
    } catch {
        return null;
    }
    return this.usersRepository.findCredentialsByPhone(phone);
}

export async function verifyCredentials(
    this: UsersService,
    identifier: string,
    password: string,
): Promise<User | null> {
    const credentials = await findCredentials.call(this, identifier);
    if (credentials === null) {
        this.dummyPasswordHash ??= this.hasher.hash(randomUUID());
        await this.hasher.compare(password, await this.dummyPasswordHash);
        return null;
    }

    const matches = await this.hasher.compare(password, credentials.passwordHash);
    if (!matches || !credentials.user.isActive) {
        return null;
    }
    return this.toUserView(credentials.user);
}

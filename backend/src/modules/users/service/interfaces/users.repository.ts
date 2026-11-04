import type { Role } from "../../../../shared/auth/roles.js";

export * from "../../domain/errors.js";

export interface UserAllergyRecord {
    readonly id: string;
    readonly name: string;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface UserRecord {
    readonly id: string;
    readonly name: string;
    readonly email: string | null;
    readonly phone: string;
    readonly role: Role;
    readonly address: string | null;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly allergyNote: string | null;
    readonly isActive: boolean;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
    readonly allergies: readonly UserAllergyRecord[];
}

export interface UserCredentialsRecord {
    readonly user: UserRecord;
    readonly passwordHash: string;
}

export interface NewUserRecord {
    readonly name: string;
    readonly email: string | null;
    readonly phone: string;
    readonly passwordHash: string;
    readonly role: Role;
    readonly address: string | null;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly allergyNote: string | null;
    readonly allergyIds: readonly string[];
}

export interface UsersRepository {
    findById(id: string): Promise<UserRecord | null>;
    findCredentialsByPhone(phone: string): Promise<UserCredentialsRecord | null>;
    findCredentialsByEmail(email: string): Promise<UserCredentialsRecord | null>;
    existsByPhone(phone: string): Promise<boolean>;
    existsByEmail(email: string): Promise<boolean>;
    findMissingAllergyIds(ids: readonly string[]): Promise<readonly string[]>;
    create(user: NewUserRecord): Promise<UserRecord>;
}

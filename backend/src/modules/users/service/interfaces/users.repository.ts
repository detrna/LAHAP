import type { Role } from "../../../../shared/auth/roles.js";
import type { UniqueUserField } from "../../domain/errors.js";

export * from "../../domain/errors.js";

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
    readonly allergyIds: readonly string[];
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
    readonly isActive: boolean;
    readonly allergyIds: readonly string[];
}

export interface UserChanges {
    readonly name?: string | undefined;
    readonly email?: string | null | undefined;
    readonly phone?: string | undefined;
    readonly passwordHash?: string | undefined;
    readonly role?: Role | undefined;
    readonly address?: string | null | undefined;
    readonly latitude?: number | null | undefined;
    readonly longitude?: number | null | undefined;
    readonly allergyNote?: string | null | undefined;
    readonly isActive?: boolean | undefined;
}

export interface UpdateUserOptions {
    readonly allergyIds?: readonly string[] | undefined;
    readonly ensureActiveAdminRemains?: boolean | undefined;
}

export interface UserConflictQuery {
    readonly phone?: string | undefined;
    readonly email?: string | undefined;
    readonly exceptId: string;
}

export interface UserListQuery {
    readonly search?: string | undefined;
    readonly phoneSearch?: string | undefined;
    readonly roles?: readonly Role[] | undefined;
    readonly isActive?: boolean | undefined;
    readonly churned?: ChurnedFilter | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface ChurnedFilter {
    readonly userIds: readonly string[];
    readonly isChurned: boolean;
}

export interface UserListRecord {
    readonly items: readonly UserRecord[];
    readonly total: number;
}

export interface UsersRepository {
    findById(id: string): Promise<UserRecord | null>;
    findByIds(ids: readonly string[]): Promise<readonly UserRecord[]>;
    findCredentialsByPhone(phone: string): Promise<UserCredentialsRecord | null>;
    findCredentialsByEmail(email: string): Promise<UserCredentialsRecord | null>;
    findCredentialsById(id: string): Promise<UserCredentialsRecord | null>;
    existsByPhone(phone: string): Promise<boolean>;
    existsByEmail(email: string): Promise<boolean>;
    findConflict(query: UserConflictQuery): Promise<UniqueUserField | null>;
    create(user: NewUserRecord): Promise<UserRecord>;
    update(id: string, changes: UserChanges, options?: UpdateUserOptions): Promise<UserRecord | null>;
    updatePasswordHash(id: string, passwordHash: string): Promise<boolean>;
    list(query: UserListQuery): Promise<UserListRecord>;
    listActiveUserIds(role: Role): Promise<readonly string[]>;
    countActiveUsers(role: Role): Promise<number>;
    filterActiveUserIds(ids: readonly string[], role: Role): Promise<readonly string[]>;
}

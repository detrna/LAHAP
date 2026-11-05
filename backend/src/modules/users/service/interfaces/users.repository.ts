import type { Role } from "../../../../shared/auth/roles.js";
import type { UniqueUserField } from "../../domain/errors.js";

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
    readonly isChurned?: boolean | undefined;
    readonly churnCutoff: Temporal.PlainDate;
    readonly skip: number;
    readonly take: number;
}

export interface UserListItemRecord {
    readonly user: UserRecord;
    readonly lastSuccessEndDate: Temporal.PlainDate | null;
}

export interface UserListRecord {
    readonly items: readonly UserListItemRecord[];
    readonly total: number;
}

export interface MembershipTierRecord {
    readonly id: string;
    readonly name: string;
    readonly description: string | null;
    readonly requiredSubscriptionDays: number;
    readonly durationDays: number;
    readonly discountPercent: number;
    readonly photoKey: string | null;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface MembershipRecord {
    readonly tierId: string;
    readonly tier: MembershipTierRecord;
    readonly startedAt: Temporal.PlainDateTime;
    readonly expiresAt: Temporal.PlainDateTime;
}

export interface UsersRepository {
    findById(id: string): Promise<UserRecord | null>;
    findCredentialsByPhone(phone: string): Promise<UserCredentialsRecord | null>;
    findCredentialsByEmail(email: string): Promise<UserCredentialsRecord | null>;
    findCredentialsById(id: string): Promise<UserCredentialsRecord | null>;
    existsByPhone(phone: string): Promise<boolean>;
    existsByEmail(email: string): Promise<boolean>;
    findMissingAllergyIds(ids: readonly string[]): Promise<readonly string[]>;
    findConflict(query: UserConflictQuery): Promise<UniqueUserField | null>;
    create(user: NewUserRecord): Promise<UserRecord>;
    update(id: string, changes: UserChanges, options?: UpdateUserOptions): Promise<UserRecord | null>;
    updatePasswordHash(id: string, passwordHash: string): Promise<boolean>;
    list(query: UserListQuery): Promise<UserListRecord>;
    findMembership(userId: string): Promise<MembershipRecord | null>;
    findLastSuccessEndDate(userId: string): Promise<Temporal.PlainDate | null>;
}

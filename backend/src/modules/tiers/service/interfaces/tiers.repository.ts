export * from "../../domain/errors.js";

export interface TierRecord {
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
    readonly tier: TierRecord;
    readonly startedAt: Temporal.PlainDateTime;
    readonly expiresAt: Temporal.PlainDateTime;
}

export interface MembershipWindowRecord {
    readonly tierId: string;
    readonly startedAt: Temporal.PlainDateTime;
    readonly expiresAt: Temporal.PlainDateTime;
}

export interface NewTierRecord {
    readonly name: string;
    readonly description: string | null;
    readonly requiredSubscriptionDays: number;
    readonly durationDays: number;
    readonly discountPercent: number;
    readonly photoKey: string | null;
}

export interface TierChanges {
    readonly name?: string | undefined;
    readonly description?: string | null | undefined;
    readonly requiredSubscriptionDays?: number | undefined;
    readonly durationDays?: number | undefined;
    readonly discountPercent?: number | undefined;
    readonly photoKey?: string | null | undefined;
}

export interface TierListQuery {
    readonly skip: number;
    readonly take: number;
}

export interface TierListRecord {
    readonly items: readonly TierRecord[];
    readonly total: number;
}

export interface MembershipUpsert {
    readonly userId: string;
    readonly tierId: string;
    readonly startedAt: Temporal.PlainDateTime;
    readonly expiresAt: Temporal.PlainDateTime;
}

export interface MembershipStore {
    listAllTiers(): Promise<readonly TierRecord[]>;
    findMembershipByUserId(userId: string): Promise<MembershipRecord | null>;
    upsertMembership(membership: MembershipUpsert): Promise<void>;
    changeMembershipTier(userId: string, tierId: string): Promise<void>;
    deleteMembership(userId: string): Promise<void>;
}

export interface TiersRepository extends MembershipStore {
    listTiers(query: TierListQuery): Promise<TierListRecord>;
    findTierById(id: string): Promise<TierRecord | null>;
    createTier(record: NewTierRecord): Promise<TierRecord>;
    updateTier(id: string, changes: TierChanges): Promise<TierRecord | null>;
    deleteTier(id: string): Promise<boolean>;
    listMembershipWindows(): Promise<readonly MembershipWindowRecord[]>;
    withUserLock<T>(userId: string, work: (store: MembershipStore) => Promise<T>): Promise<T>;
}

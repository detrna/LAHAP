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

export interface TiersRepository {
    findMembershipByUserId(userId: string): Promise<MembershipRecord | null>;
}

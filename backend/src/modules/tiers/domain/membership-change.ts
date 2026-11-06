import type { WindowTier } from "./effective-membership.js";

export interface QualifyingTier extends WindowTier {
    readonly id: string;
}

export interface CurrentMembership {
    readonly tier: { readonly requiredSubscriptionDays: number };
}

export interface MembershipChangeInput {
    readonly current: CurrentMembership | null;
    readonly qualifying: QualifyingTier | null;
    readonly renewWindow: boolean;
    readonly now: Temporal.PlainDateTime;
}

export type MembershipChange =
    | { readonly kind: "none" }
    | { readonly kind: "delete" }
    | {
          readonly kind: "insert" | "renew";
          readonly tierId: string;
          readonly startedAt: Temporal.PlainDateTime;
          readonly expiresAt: Temporal.PlainDateTime;
      }
    | { readonly kind: "changeTier"; readonly tierId: string };

export function decideMembershipChange({
    current,
    qualifying,
    renewWindow,
    now,
}: MembershipChangeInput): MembershipChange {
    if (qualifying === null) return current === null ? { kind: "none" } : { kind: "delete" };

    if (renewWindow) {
        return {
            kind: current === null ? "insert" : "renew",
            tierId: qualifying.id,
            startedAt: now,
            expiresAt: now.add({ days: qualifying.durationDays }),
        };
    }

    if (current === null) return { kind: "none" };
    if (qualifying.requiredSubscriptionDays < current.tier.requiredSubscriptionDays) {
        return { kind: "changeTier", tierId: qualifying.id };
    }
    return { kind: "none" };
}

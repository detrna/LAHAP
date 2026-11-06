import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import { decideMembershipChange } from "../domain/membership-change.js";
import { qualifyingTier } from "../domain/qualifying-tier.js";
import type { TiersService } from "./tiers.service.js";

export interface ReevaluateOptions {
    readonly renewWindow: boolean;
}

export async function reevaluate(this: TiersService, userId: string, options: ReevaluateOptions): Promise<void> {
    await this.tiersRepository.withUserLock(userId, async store => {
        const days = await this.orderStats.countPaidServiceDays(userId);
        const tiers = await store.listAllTiers();
        const current = await store.findMembershipByUserId(userId);

        const change = decideMembershipChange({
            current,
            qualifying: qualifyingTier(tiers, days),
            renewWindow: options.renewWindow,
            now: toDbTimestamp(this.clock.now()),
        });

        switch (change.kind) {
            case "none":
                return;
            case "delete":
                await store.deleteMembership(userId);
                return;
            case "insert":
            case "renew":
                await store.upsertMembership({
                    userId,
                    tierId: change.tierId,
                    startedAt: change.startedAt,
                    expiresAt: change.expiresAt,
                });
                return;
            case "changeTier":
                await store.changeMembershipTier(userId, change.tierId);
                return;
        }
    });
}

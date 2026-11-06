import { describe, expect, it } from "vitest";
import { buildMembershipRecord, buildTierRecord } from "../test-utils/factory/tiers.factory.js";
import { setupTiersService } from "../test-utils/setup/tiers.setup.js";

const BIASA = buildTierRecord({ id: "biasa", requiredSubscriptionDays: 0, durationDays: 30 });
const SILVER = buildTierRecord({ id: "silver", requiredSubscriptionDays: 30, durationDays: 30 });
const GOLD = buildTierRecord({ id: "gold", requiredSubscriptionDays: 60, durationDays: 20 });

const NOW = Temporal.PlainDateTime.from("2026-11-03T01:00:00");

function setup(days: number) {
    const context = setupTiersService();
    context.repository.listAllTiers.mockResolvedValue([BIASA, SILVER, GOLD]);
    context.orderStats.countPaidServiceDays.mockResolvedValue(days);
    return context;
}

describe("TiersService.reevaluate (unit)", () => {
    it("takes the user lock before reading the day count", async () => {
        const { orderStats, repository, service } = setup(10);
        const order: string[] = [];
        repository.withUserLock.mockImplementation(
            async (_userId: string, work: (store: unknown) => Promise<unknown>) => {
                order.push("lock");
                return work(repository);
            },
        );
        orderStats.countPaidServiceDays.mockImplementation(async () => {
            order.push("count");
            return 10;
        });

        await service.reevaluate("user-1", { renewWindow: true });

        expect(order).toEqual(["lock", "count"]);
        expect(repository.withUserLock).toHaveBeenCalledWith("user-1", expect.any(Function));
    });

    it("creates a membership with a new window on a first payment", async () => {
        const { repository, service } = setup(10);

        await service.reevaluate("user-1", { renewWindow: true });

        expect(repository.upsertMembership).toHaveBeenCalledWith({
            userId: "user-1",
            tierId: "biasa",
            startedAt: NOW,
            expiresAt: NOW.add({ days: 30 }),
        });
    });

    it("renews the window and moves up when the days reach a higher tier", async () => {
        const { repository, service } = setup(60);
        repository.findMembershipByUserId.mockResolvedValue(buildMembershipRecord({ tierId: "silver", tier: SILVER }));

        await service.reevaluate("user-1", { renewWindow: true });

        expect(repository.upsertMembership).toHaveBeenCalledWith({
            userId: "user-1",
            tierId: "gold",
            startedAt: NOW,
            expiresAt: NOW.add({ days: 20 }),
        });
    });

    it("moves down on a cancellation and keeps the stored dates", async () => {
        const { repository, service } = setup(40);
        repository.findMembershipByUserId.mockResolvedValue(buildMembershipRecord({ tierId: "gold", tier: GOLD }));

        await service.reevaluate("user-1", { renewWindow: false });

        expect(repository.changeMembershipTier).toHaveBeenCalledWith("user-1", "silver");
        expect(repository.upsertMembership).not.toHaveBeenCalled();
    });

    it("does nothing on a cancellation that doesn't lower the tier", async () => {
        const { repository, service } = setup(100);
        repository.findMembershipByUserId.mockResolvedValue(buildMembershipRecord({ tierId: "gold", tier: GOLD }));

        await service.reevaluate("user-1", { renewWindow: false });

        expect(repository.changeMembershipTier).not.toHaveBeenCalled();
        expect(repository.upsertMembership).not.toHaveBeenCalled();
        expect(repository.deleteMembership).not.toHaveBeenCalled();
    });

    it("does nothing on a cancellation when there is no membership row", async () => {
        const { repository, service } = setup(40);

        await service.reevaluate("user-1", { renewWindow: false });

        expect(repository.upsertMembership).not.toHaveBeenCalled();
        expect(repository.changeMembershipTier).not.toHaveBeenCalled();
    });

    it("deletes the membership when no paid days are left", async () => {
        const { repository, service } = setup(0);
        repository.findMembershipByUserId.mockResolvedValue(buildMembershipRecord({ tierId: "biasa", tier: BIASA }));

        await service.reevaluate("user-1", { renewWindow: false });

        expect(repository.deleteMembership).toHaveBeenCalledWith("user-1");
    });

    it("lets a failure from the day count through", async () => {
        const { orderStats, service } = setup(0);
        orderStats.countPaidServiceDays.mockRejectedValue(new Error("orders down"));

        await expect(service.reevaluate("user-1", { renewWindow: true })).rejects.toThrow("orders down");
    });
});

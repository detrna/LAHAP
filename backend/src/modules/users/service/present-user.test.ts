import { describe, expect, it } from "vitest";
import {
    buildMembershipRecord,
    buildMembershipTierRecord,
    buildUserRecord,
} from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";

describe("UsersService.toMembership (unit)", () => {
    it("maps the membership with Jakarta timestamps and a signed tier badge", async () => {
        const { service } = setupUsersService();
        const record = buildMembershipRecord({ tier: buildMembershipTierRecord({ photoKey: "tiers/gold.webp" }) });

        expect(await service.toMembership(record)).toEqual({
            tierId: record.tierId,
            tier: {
                id: record.tier.id,
                name: "Gold",
                description: null,
                requiredSubscriptionDays: 30,
                durationDays: 30,
                discountPercent: 10,
                photoKey: "tiers/gold.webp",
                photoUrl: "https://storage.test/tiers/gold.webp?signed",
                createdAt: "2026-11-03T08:00:00.000+07:00",
                updatedAt: "2026-11-03T08:00:00.000+07:00",
            },
            startedAt: "2026-11-01T08:00:00.000+07:00",
            expiresAt: "2026-12-01T08:00:00.000+07:00",
            isActive: true,
        });
    });

    it("is inactive from the moment it expires", async () => {
        const { service } = setupUsersService();
        const expiresAt = Temporal.PlainDateTime.from("2026-11-03T01:00:00");

        expect(await service.toMembership(buildMembershipRecord({ expiresAt }))).toMatchObject({ isActive: false });
        expect(
            await service.toMembership(buildMembershipRecord({ expiresAt: expiresAt.add({ seconds: 1 }) })),
        ).toMatchObject({ isActive: true });
    });

    it("gives null without a membership and leaves photoUrl null without a badge", async () => {
        const { objectStorage, service } = setupUsersService();

        expect(await service.toMembership(null)).toBeNull();
        expect((await service.toMembership(buildMembershipRecord()))?.tier?.photoUrl).toBeNull();
        expect(objectStorage.getSignedUrl).not.toHaveBeenCalled();
    });
});

describe("UsersService.toUserDetail (unit)", () => {
    it("marks a customer whose last order ended over 14 days ago as churned", async () => {
        const { repository, service } = setupUsersService();
        repository.findLastSuccessEndDate.mockResolvedValue(Temporal.PlainDate.from("2026-10-19"));

        const user = await service.toUserDetail(buildUserRecord());

        expect(user).toMatchObject({ membership: null, isChurned: true });
    });

    it("does not mark a customer churned on day 14", async () => {
        const { repository, service } = setupUsersService();
        repository.findLastSuccessEndDate.mockResolvedValue(Temporal.PlainDate.from("2026-10-20"));

        expect(await service.toUserDetail(buildUserRecord())).toMatchObject({ isChurned: false });
    });

    it("never marks staff churned and skips the lookup", async () => {
        const { repository, service } = setupUsersService();

        expect(await service.toUserDetail(buildUserRecord({ role: "KITCHEN" }))).toMatchObject({ isChurned: false });
        expect(repository.findLastSuccessEndDate).not.toHaveBeenCalled();
    });
});

describe("UsersService.toProfile (unit)", () => {
    it("adds the membership but no churn data", async () => {
        const { repository, service } = setupUsersService();
        repository.findMembership.mockResolvedValue(buildMembershipRecord());

        const user = await service.toProfile(buildUserRecord());

        expect(repository.findMembership).toHaveBeenCalledWith(buildUserRecord().id);
        expect(user.membership).toMatchObject({ tierId: buildMembershipRecord().tierId });
        expect(user).not.toHaveProperty("isChurned");
    });
});

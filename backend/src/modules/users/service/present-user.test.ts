import { describe, expect, it } from "vitest";
import { buildAllergy } from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildMembership } from "../../tiers/test-utils/factory/tiers.factory.js";
import { buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";

const ALLERGY_ID = buildAllergy().id;

describe("UsersService.toUserView (unit)", () => {
    it("adds the allergies from the catalog, without membership or churn data", async () => {
        const { allergyLookup, membershipLookup, service } = setupUsersService();
        allergyLookup.getAllergiesByIds.mockResolvedValue([buildAllergy()]);

        const user = await service.toUserView(buildUserRecord({ allergyIds: [ALLERGY_ID] }));

        expect(allergyLookup.getAllergiesByIds).toHaveBeenCalledWith([ALLERGY_ID]);
        expect(user.allergies).toEqual([buildAllergy()]);
        expect(user).not.toHaveProperty("membership");
        expect(user).not.toHaveProperty("isChurned");
        expect(membershipLookup.getMembership).not.toHaveBeenCalled();
    });
});

describe("UsersService.toUserDetail (unit)", () => {
    it("marks a customer whose last order ended over 14 days ago as churned", async () => {
        const { subscriptionHistory, service } = setupUsersService();
        const record = buildUserRecord();
        subscriptionHistory.findLastSuccessEndDates.mockResolvedValue(
            new Map([[record.id, Temporal.PlainDate.from("2026-10-19")]]),
        );

        expect(await service.toUserDetail(record)).toMatchObject({ membership: null, isChurned: true });
        expect(subscriptionHistory.findLastSuccessEndDates).toHaveBeenCalledWith([record.id]);
    });

    it("does not mark a customer churned on day 14, or without any paid order", async () => {
        const { subscriptionHistory, service } = setupUsersService();
        const record = buildUserRecord();
        subscriptionHistory.findLastSuccessEndDates.mockResolvedValueOnce(
            new Map([[record.id, Temporal.PlainDate.from("2026-10-20")]]),
        );

        expect(await service.toUserDetail(record)).toMatchObject({ isChurned: false });
        expect(await service.toUserDetail(record)).toMatchObject({ isChurned: false });
    });

    it("never marks staff churned and skips the lookup", async () => {
        const { subscriptionHistory, service } = setupUsersService();

        expect(await service.toUserDetail(buildUserRecord({ role: "KITCHEN" }))).toMatchObject({ isChurned: false });
        expect(subscriptionHistory.findLastSuccessEndDates).not.toHaveBeenCalled();
    });
});

describe("UsersService.toProfile (unit)", () => {
    it("adds the membership and allergies but no churn data", async () => {
        const { allergyLookup, membershipLookup, subscriptionHistory, service } = setupUsersService();
        const membership = buildMembership({ isActive: true });
        membershipLookup.getMembership.mockResolvedValue(membership);
        allergyLookup.getAllergiesByIds.mockResolvedValue([buildAllergy()]);

        const user = await service.toProfile(buildUserRecord({ allergyIds: [ALLERGY_ID] }));

        expect(membershipLookup.getMembership).toHaveBeenCalledWith(buildUserRecord().id);
        expect(user).toMatchObject({ membership, allergies: [buildAllergy()] });
        expect(user).not.toHaveProperty("isChurned");
        expect(subscriptionHistory.findLastSuccessEndDates).not.toHaveBeenCalled();
    });
});

import { describe, expect, it } from "vitest";
import { buildMembershipRecord, buildTierRecord } from "../test-utils/factory/tiers.factory.js";
import { setupTiersService } from "../test-utils/setup/tiers.setup.js";

const BIASA = buildTierRecord({ id: "biasa", requiredSubscriptionDays: 0, discountPercent: 0 });
const SILVER = buildTierRecord({ id: "silver", requiredSubscriptionDays: 30, discountPercent: 5 });
const GOLD = buildTierRecord({ id: "gold", requiredSubscriptionDays: 60, discountPercent: 10 });

const at = (value: string) => Temporal.PlainDateTime.from(value);

function setup() {
    const context = setupTiersService();
    context.repository.listAllTiers.mockResolvedValue([BIASA, SILVER, GOLD]);
    return context;
}

describe("TiersService.getActiveDiscount (unit)", () => {
    it("gives the tier and percent of an active membership", async () => {
        const { repository, service } = setup();
        repository.findMembershipByUserId.mockResolvedValue(buildMembershipRecord({ tierId: "gold", tier: GOLD }));

        expect(await service.getActiveDiscount("user-1")).toEqual({ tierId: "gold", discountPercent: 10 });
    });

    it("gives Silver's discount to a Gold member whose window has lapsed", async () => {
        const { repository, service } = setup();
        repository.findMembershipByUserId.mockResolvedValue(
            buildMembershipRecord({
                tierId: "gold",
                tier: GOLD,
                startedAt: at("2026-10-01T01:00:00"),
                expiresAt: at("2026-11-02T01:00:00"),
            }),
        );

        expect(await service.getActiveDiscount("user-1")).toEqual({ tierId: "silver", discountPercent: 5 });
    });

    it("gives null once even the lowest tier's window has passed", async () => {
        const { repository, service } = setup();
        repository.findMembershipByUserId.mockResolvedValue(
            buildMembershipRecord({
                tierId: "silver",
                tier: SILVER,
                startedAt: at("2026-08-01T01:00:00"),
                expiresAt: at("2026-09-01T01:00:00"),
            }),
        );

        expect(await service.getActiveDiscount("user-1")).toBeNull();
    });

    it("gives null for a 0 % tier, so no tier is recorded at checkout", async () => {
        const { repository, service } = setup();
        repository.findMembershipByUserId.mockResolvedValue(buildMembershipRecord({ tierId: "biasa", tier: BIASA }));

        expect(await service.getActiveDiscount("user-1")).toBeNull();
    });

    it("gives null without a membership", async () => {
        const { service } = setup();

        expect(await service.getActiveDiscount("user-1")).toBeNull();
    });
});

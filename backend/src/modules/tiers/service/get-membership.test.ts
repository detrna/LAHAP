import { describe, expect, it } from "vitest";
import { buildMembershipRecord, buildTierRecord } from "../test-utils/factory/tiers.factory.js";
import { setupTiersService } from "../test-utils/setup/tiers.setup.js";

const GOLD = buildTierRecord({ id: "gold", name: "Gold", requiredSubscriptionDays: 60, photoKey: "tiers/gold.webp" });
const SILVER = buildTierRecord({ id: "silver", name: "Silver", requiredSubscriptionDays: 30, discountPercent: 5 });
const BIASA = buildTierRecord({ id: "biasa", name: "Biasa", requiredSubscriptionDays: 0, discountPercent: 0 });

function setup() {
    const context = setupTiersService();
    context.repository.listAllTiers.mockResolvedValue([BIASA, SILVER, GOLD]);
    return context;
}

describe("TiersService.getMembership (unit)", () => {
    it("maps the user's membership with Jakarta timestamps and a signed tier badge", async () => {
        const { repository, service } = setup();
        repository.findMembershipByUserId.mockResolvedValue(buildMembershipRecord({ tierId: "gold", tier: GOLD }));

        expect(await service.getMembership("user-1")).toEqual({
            tierId: "gold",
            tier: {
                id: "gold",
                name: "Gold",
                description: null,
                requiredSubscriptionDays: 60,
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
        expect(repository.findMembershipByUserId).toHaveBeenCalledWith("user-1");
    });

    it("is inactive from the moment the lowest tier's window expires", async () => {
        const { repository, service } = setup();
        const expiresAt = Temporal.PlainDateTime.from("2026-11-03T01:00:00");

        repository.findMembershipByUserId.mockResolvedValueOnce(
            buildMembershipRecord({ tierId: "biasa", tier: BIASA, expiresAt }),
        );
        expect(await service.getMembership("user-1")).toMatchObject({ tierId: "biasa", isActive: false });
        repository.findMembershipByUserId.mockResolvedValueOnce(
            buildMembershipRecord({ tierId: "biasa", tier: BIASA, expiresAt: expiresAt.add({ seconds: 1 }) }),
        );
        expect(await service.getMembership("user-1")).toMatchObject({ isActive: true });
    });

    it("steps an expired Gold down to Silver with a window starting at the old expiry", async () => {
        const { repository, service } = setup();
        repository.findMembershipByUserId.mockResolvedValue(
            buildMembershipRecord({
                tierId: "gold",
                tier: GOLD,
                startedAt: Temporal.PlainDateTime.from("2026-10-01T01:00:00"),
                expiresAt: Temporal.PlainDateTime.from("2026-11-02T01:00:00"),
            }),
        );

        expect(await service.getMembership("user-1")).toMatchObject({
            tierId: "silver",
            tier: { name: "Silver" },
            startedAt: "2026-11-02T08:00:00.000+07:00",
            expiresAt: "2026-12-02T08:00:00.000+07:00",
            isActive: true,
        });
    });

    it("gives null without a membership, without reading the tier list", async () => {
        const { repository, service } = setup();

        expect(await service.getMembership("user-1")).toBeNull();
        expect(repository.listAllTiers).not.toHaveBeenCalled();
    });

    it("leaves photoUrl null without a badge and signs nothing", async () => {
        const { objectStorage, repository, service } = setup();
        repository.findMembershipByUserId.mockResolvedValue(buildMembershipRecord({ tierId: "silver", tier: SILVER }));

        expect((await service.getMembership("user-1"))?.tier?.photoUrl).toBeNull();
        expect(objectStorage.getSignedUrl).not.toHaveBeenCalled();
    });
});

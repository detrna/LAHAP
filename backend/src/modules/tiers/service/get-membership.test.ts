import { describe, expect, it } from "vitest";
import { createFixedClock } from "../../../../tests/utils/factory/clock/clock.js";
import type { ObjectStorage } from "../../../shared/ports/object-storage/object-storage.js";
import { buildMembershipRecord, buildTierRecord } from "../test-utils/factory/tiers.factory.js";
import { createMockObjectStorage, createMockTiersRepository } from "../test-utils/mocks/tiers.mocks.js";
import { TiersService } from "./tiers.service.js";

function setup() {
    const repository = createMockTiersRepository();
    const objectStorage = createMockObjectStorage();
    const service = new TiersService(repository, objectStorage as unknown as ObjectStorage, createFixedClock());
    return { repository, objectStorage, service };
}

describe("TiersService.getMembership (unit)", () => {
    it("maps the user's membership with Jakarta timestamps and a signed tier badge", async () => {
        const { repository, service } = setup();
        const record = buildMembershipRecord({ tier: buildTierRecord({ photoKey: "tiers/gold.webp" }) });
        repository.findMembershipByUserId.mockResolvedValue(record);

        expect(await service.getMembership("user-1")).toEqual({
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
        expect(repository.findMembershipByUserId).toHaveBeenCalledWith("user-1");
    });

    it("is inactive from the moment it expires", async () => {
        const { repository, service } = setup();
        const expiresAt = Temporal.PlainDateTime.from("2026-11-03T01:00:00");

        repository.findMembershipByUserId.mockResolvedValueOnce(buildMembershipRecord({ expiresAt }));
        expect(await service.getMembership("user-1")).toMatchObject({ isActive: false });
        repository.findMembershipByUserId.mockResolvedValueOnce(
            buildMembershipRecord({ expiresAt: expiresAt.add({ seconds: 1 }) }),
        );
        expect(await service.getMembership("user-1")).toMatchObject({ isActive: true });
    });

    it("gives null without a membership and leaves photoUrl null without a badge", async () => {
        const { objectStorage, repository, service } = setup();

        expect(await service.getMembership("user-1")).toBeNull();
        repository.findMembershipByUserId.mockResolvedValue(buildMembershipRecord());
        expect((await service.getMembership("user-1"))?.tier?.photoUrl).toBeNull();
        expect(objectStorage.getSignedUrl).not.toHaveBeenCalled();
    });
});

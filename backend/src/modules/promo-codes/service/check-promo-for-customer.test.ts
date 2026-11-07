import { describe, expect, it } from "vitest";
import { buildPromoCodeRecord } from "../test-utils/factory/promo-codes.factory.js";
import { setupPromoCodesService } from "../test-utils/setup/promo-codes.setup.js";

const NOW = "2026-11-06T10:00:00+07:00[Asia/Jakarta]";
const record = buildPromoCodeRecord({
    id: "promo-1",
    code: "MERDEKA",
    minPurchase: 50000,
    quota: 5,
    isActive: true,
    validUntil: Temporal.PlainDateTime.from("2026-12-01T00:00:00"),
});

function setup() {
    const context = setupPromoCodesService(NOW);
    context.repository.findPromoCodeByCode.mockResolvedValue(record);
    return context;
}

describe("PromoCodesService.checkPromoForCustomer (unit)", () => {
    it("accepts a usable code whatever its minimum purchase, checking this customer's uses", async () => {
        const { repository, promoUsage, service } = setup();

        expect(await service.checkPromoForCustomer(" merdeka ", "user-1")).toMatchObject({
            valid: true,
            promoCode: { id: "promo-1", code: "MERDEKA" },
        });
        expect(repository.findPromoCodeByCode).toHaveBeenCalledWith("MERDEKA");
        expect(promoUsage.countPromoUsesByUser).toHaveBeenCalledWith("promo-1", "user-1");
    });

    it.each([
        ["an unknown code", { found: null }, "NOT_FOUND"],
        ["an inactive code", { found: { ...record, isActive: false } }, "INACTIVE"],
        [
            "an expired code",
            { found: { ...record, validUntil: Temporal.PlainDateTime.from("2026-11-01T00:00:00") } },
            "EXPIRED",
        ],
        ["a code with no quota left", { uses: 5 }, "QUOTA_EXHAUSTED"],
        ["a code this customer already used", { userUses: 1 }, "ALREADY_USED"],
    ] as const)(
        "rejects %s",
        async (_, arrange: { found?: typeof record | null; uses?: number; userUses?: number }, reason) => {
            const { repository, promoUsage, service } = setup();
            if (arrange.found !== undefined) repository.findPromoCodeByCode.mockResolvedValue(arrange.found);
            promoUsage.countPromoUses.mockResolvedValue(new Map([["promo-1", arrange.uses ?? 0]]));
            promoUsage.countPromoUsesByUser.mockResolvedValue(arrange.userUses ?? 0);

            expect(await service.checkPromoForCustomer("MERDEKA", "user-1")).toMatchObject({ valid: false, reason });
        },
    );
});

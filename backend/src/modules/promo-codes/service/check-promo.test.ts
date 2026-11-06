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

describe("PromoCodesService.checkPromo (unit)", () => {
    it("normalises the code and checks it against both usage counts", async () => {
        const { repository, promoUsage, service } = setupPromoCodesService(NOW);
        repository.findPromoCodeByCode.mockResolvedValue(record);
        promoUsage.countPromoUses.mockResolvedValue(new Map([["promo-1", 4]]));
        promoUsage.countPromoUsesByUser.mockResolvedValue(0);

        const result = await service.checkPromo({ code: " merdeka ", userId: "user-1", foodSubtotal: 75000 });

        expect(result).toMatchObject({ valid: true, promoCode: { id: "promo-1", code: "MERDEKA" } });
        expect(repository.findPromoCodeByCode).toHaveBeenCalledWith("MERDEKA");
        expect(promoUsage.countPromoUses).toHaveBeenCalledWith(["promo-1"]);
        expect(promoUsage.countPromoUsesByUser).toHaveBeenCalledWith("promo-1", "user-1");
    });

    it("answers NOT_FOUND for an unknown code", async () => {
        const { service } = setupPromoCodesService(NOW);

        expect(await service.checkPromo({ code: "nope", userId: "user-1", foodSubtotal: 75000 })).toEqual({
            valid: false,
            code: "NOPE",
            reason: "NOT_FOUND",
        });
    });

    it("answers NOT_FOUND for a malformed code without a lookup", async () => {
        const { repository, service } = setupPromoCodesService(NOW);

        const result = await service.checkPromo({ code: "no spaces!", userId: "user-1", foodSubtotal: 75000 });

        expect(result).toMatchObject({ valid: false, reason: "NOT_FOUND" });
        expect(repository.findPromoCodeByCode).not.toHaveBeenCalled();
    });

    it("rejects a code the customer already used", async () => {
        const { repository, promoUsage, service } = setupPromoCodesService(NOW);
        repository.findPromoCodeByCode.mockResolvedValue(record);
        promoUsage.countPromoUsesByUser.mockResolvedValue(1);

        expect(await service.checkPromo({ code: "MERDEKA", userId: "user-1", foodSubtotal: 75000 })).toEqual({
            valid: false,
            code: "MERDEKA",
            reason: "ALREADY_USED",
        });
    });

    it("rejects a subtotal below the minimum purchase", async () => {
        const { repository, service } = setupPromoCodesService(NOW);
        repository.findPromoCodeByCode.mockResolvedValue(record);

        const result = await service.checkPromo({ code: "MERDEKA", userId: "user-1", foodSubtotal: 49000 });

        expect(result).toMatchObject({ valid: false, reason: "MIN_PURCHASE_NOT_MET" });
    });
});

import { describe, expect, it } from "vitest";
import { buildPromoCodeRecord } from "../test-utils/factory/promo-codes.factory.js";
import { setupPromoCodesService } from "../test-utils/setup/promo-codes.setup.js";
import { PromoCodeNotFoundError } from "./interfaces/promo-codes.repository.js";

describe("PromoCodesService.getPromoCode (unit)", () => {
    it("throws PromoCodeNotFoundError when missing", async () => {
        const { service } = setupPromoCodesService();

        await expect(service.getPromoCode("missing")).rejects.toBeInstanceOf(PromoCodeNotFoundError);
    });

    it("returns the code with its use count and Jakarta timestamps", async () => {
        const { promoUsage, repository, service } = setupPromoCodesService();
        repository.findPromoCodeById.mockResolvedValue(
            buildPromoCodeRecord({
                id: "promo",
                discountValue: 12.5,
                minPurchase: 30000,
                validUntil: Temporal.PlainDateTime.from("2026-12-01T00:00:00"),
            }),
        );
        promoUsage.countPromoUses.mockResolvedValue(new Map([["promo", 3]]));

        expect(await service.getPromoCode("promo")).toMatchObject({
            id: "promo",
            discountValue: 12.5,
            minPurchase: 30000,
            usedCount: 3,
            validUntil: "2026-12-01T07:00:00.000+07:00",
        });
    });
});

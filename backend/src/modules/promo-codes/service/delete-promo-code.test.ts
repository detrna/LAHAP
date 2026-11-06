import { describe, expect, it } from "vitest";
import { buildPromoCodeRecord } from "../test-utils/factory/promo-codes.factory.js";
import { setupPromoCodesService } from "../test-utils/setup/promo-codes.setup.js";
import { PromoCodeInUseError, PromoCodeNotFoundError } from "./interfaces/promo-codes.repository.js";

function setup() {
    const context = setupPromoCodesService();
    context.repository.findPromoCodeById.mockResolvedValue(buildPromoCodeRecord({ id: "promo" }));
    context.repository.deletePromoCode.mockResolvedValue(true);
    return context;
}

describe("PromoCodesService.deletePromoCode (unit)", () => {
    it("deletes a code with no pending orders", async () => {
        const { promoUsage, repository, service } = setup();

        await service.deletePromoCode("promo");

        expect(promoUsage.hasPendingSubscriptions).toHaveBeenCalledWith("promo");
        expect(repository.deletePromoCode).toHaveBeenCalledWith("promo");
    });

    it("throws PromoCodeNotFoundError for a missing code", async () => {
        const { promoUsage, service } = setupPromoCodesService();

        await expect(service.deletePromoCode("missing")).rejects.toBeInstanceOf(PromoCodeNotFoundError);
        expect(promoUsage.hasPendingSubscriptions).not.toHaveBeenCalled();
    });

    it("refuses while a pending order uses the code", async () => {
        const { promoUsage, repository, service } = setup();
        promoUsage.hasPendingSubscriptions.mockResolvedValue(true);

        await expect(service.deletePromoCode("promo")).rejects.toBeInstanceOf(PromoCodeInUseError);
        expect(repository.deletePromoCode).not.toHaveBeenCalled();
    });

    it("throws PromoCodeNotFoundError when the code vanishes before the delete", async () => {
        const { repository, service } = setup();
        repository.deletePromoCode.mockResolvedValue(false);

        await expect(service.deletePromoCode("promo")).rejects.toBeInstanceOf(PromoCodeNotFoundError);
    });
});

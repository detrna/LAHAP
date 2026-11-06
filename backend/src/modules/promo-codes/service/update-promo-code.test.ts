import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../shared/errors/validation-error.js";
import { buildPromoCodeRecord } from "../test-utils/factory/promo-codes.factory.js";
import { setupPromoCodesService } from "../test-utils/setup/promo-codes.setup.js";
import { PromoCodeAlreadyExistsError, PromoCodeNotFoundError } from "./interfaces/promo-codes.repository.js";

const EXISTING = buildPromoCodeRecord({ id: "promo", discountType: "Persen", discountValue: 20 });

function setup() {
    const context = setupPromoCodesService();
    context.repository.findPromoCodeById.mockResolvedValue(EXISTING);
    context.repository.updatePromoCode.mockResolvedValue(EXISTING);
    return context;
}

describe("PromoCodesService.updatePromoCode (unit)", () => {
    it("throws PromoCodeNotFoundError when the code is missing", async () => {
        const { repository, service } = setupPromoCodesService();

        await expect(service.updatePromoCode("missing", { isActive: false })).rejects.toBeInstanceOf(
            PromoCodeNotFoundError,
        );
        expect(repository.updatePromoCode).not.toHaveBeenCalled();
    });

    it("throws PromoCodeNotFoundError when the code vanishes before the write", async () => {
        const { repository, service } = setup();
        repository.updatePromoCode.mockResolvedValue(null);

        await expect(service.updatePromoCode("promo", { isActive: false })).rejects.toBeInstanceOf(
            PromoCodeNotFoundError,
        );
    });

    it("sends only the given fields", async () => {
        const { repository, service } = setup();

        await service.updatePromoCode("promo", { isActive: false, quota: 0 });

        expect(repository.updatePromoCode).toHaveBeenCalledWith("promo", { isActive: false, quota: 0 });
    });

    it("allows a quota below the uses", async () => {
        const { promoUsage, service } = setup();
        promoUsage.countPromoUses.mockResolvedValue(new Map([["promo", 10]]));

        const promoCode = await service.updatePromoCode("promo", { quota: 5 });

        expect(promoCode.usedCount).toBe(10);
    });

    it("checks the merged value when only the type changes", async () => {
        const { repository, service } = setup();
        repository.findPromoCodeById.mockResolvedValue(
            buildPromoCodeRecord({ discountType: "Nominal", discountValue: 15000 }),
        );

        await expect(service.updatePromoCode("promo", { discountType: "Persen" })).rejects.toBeInstanceOf(
            ValidationError,
        );
        expect(repository.updatePromoCode).not.toHaveBeenCalled();
    });

    it("checks the merged type when only the value changes", async () => {
        const { service } = setup();

        await expect(service.updatePromoCode("promo", { discountValue: 150 })).rejects.toBeInstanceOf(ValidationError);
    });

    it("accepts a large value once the type becomes Nominal", async () => {
        const { repository, service } = setup();

        await service.updatePromoCode("promo", { discountType: "Nominal", discountValue: 15000 });

        expect(repository.updatePromoCode).toHaveBeenCalledWith("promo", {
            discountType: "Nominal",
            discountValue: 15000,
        });
    });

    it("rejects a validUntil in the past but not an unchanged one", async () => {
        const { repository, service } = setup();

        await expect(
            service.updatePromoCode("promo", { validUntil: Temporal.PlainDateTime.from("2026-11-03T01:00:00") }),
        ).rejects.toBeInstanceOf(ValidationError);
        await service.updatePromoCode("promo", { isActive: true });

        expect(repository.updatePromoCode).toHaveBeenCalledTimes(1);
    });

    it("lets a conflict from the repository through", async () => {
        const { repository, service } = setup();
        repository.updatePromoCode.mockRejectedValue(new PromoCodeAlreadyExistsError());

        await expect(service.updatePromoCode("promo", { code: "TAKEN" })).rejects.toBeInstanceOf(
            PromoCodeAlreadyExistsError,
        );
    });
});

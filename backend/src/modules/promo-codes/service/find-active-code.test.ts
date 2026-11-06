import { describe, expect, it } from "vitest";
import { buildPromoCodeRecord } from "../test-utils/factory/promo-codes.factory.js";
import { setupPromoCodesService } from "../test-utils/setup/promo-codes.setup.js";

describe("PromoCodesService.findActiveCode (unit)", () => {
    it("finds a code whatever the case and spacing of the input", async () => {
        const { repository, service } = setupPromoCodesService();
        repository.findPromoCodeByCode.mockResolvedValue(buildPromoCodeRecord({ code: "MERDEKA" }));

        expect(await service.findActiveCode(" merdeka ")).toMatchObject({ code: "MERDEKA" });
        expect(repository.findPromoCodeByCode).toHaveBeenCalledWith("MERDEKA");
    });

    it("answers null for an unknown code", async () => {
        const { service } = setupPromoCodesService();

        expect(await service.findActiveCode("NOPE")).toBeNull();
    });

    it("answers null for an inactive code", async () => {
        const { repository, service } = setupPromoCodesService();
        repository.findPromoCodeByCode.mockResolvedValue(buildPromoCodeRecord({ isActive: false }));

        expect(await service.findActiveCode("HEMAT20")).toBeNull();
    });

    it("answers null once validUntil has been reached, and a code before it", async () => {
        const { repository, service } = setupPromoCodesService("2026-11-03T08:00:00+07:00[Asia/Jakarta]");
        repository.findPromoCodeByCode.mockResolvedValue(
            buildPromoCodeRecord({ validUntil: Temporal.PlainDateTime.from("2026-11-03T01:00:00") }),
        );
        expect(await service.findActiveCode("HEMAT20")).toBeNull();

        repository.findPromoCodeByCode.mockResolvedValue(
            buildPromoCodeRecord({ validUntil: Temporal.PlainDateTime.from("2026-11-03T01:00:01") }),
        );
        expect(await service.findActiveCode("HEMAT20")).not.toBeNull();
    });
});

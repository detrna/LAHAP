import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../shared/errors/validation-error.js";
import { buildPromoCodeRecord } from "../test-utils/factory/promo-codes.factory.js";
import { setupPromoCodesService } from "../test-utils/setup/promo-codes.setup.js";
import { PromoCodeAlreadyExistsError, PromoCodeGenerationError } from "./interfaces/promo-codes.repository.js";

function setup() {
    const context = setupPromoCodesService();
    context.repository.createPromoCode.mockImplementation(async record =>
        buildPromoCodeRecord({ id: "new", ...record }),
    );
    return context;
}

const BODY = { discountType: "Persen", discountValue: 20, quota: 50 } as const;

describe("PromoCodesService.createPromoCode (unit)", () => {
    it("fills the defaults: 14 days from now, no minimum, stacks with the tier, active", async () => {
        const { repository, service } = setup();

        const promoCode = await service.createPromoCode({ ...BODY, code: "MERDEKA" });

        expect(repository.createPromoCode).toHaveBeenCalledWith({
            code: "MERDEKA",
            discountType: "Persen",
            discountValue: 20,
            minPurchase: 0,
            allowStackWithTier: true,
            validUntil: Temporal.PlainDateTime.from("2026-11-17T01:00:00"),
            quota: 50,
            isActive: true,
        });
        expect(promoCode).toMatchObject({ id: "new", code: "MERDEKA", usedCount: 0, validUntil: expect.any(String) });
    });

    it("keeps the given fields", async () => {
        const { repository, service } = setup();
        const validUntil = Temporal.PlainDateTime.from("2026-12-31T10:00:00");

        await service.createPromoCode({
            ...BODY,
            code: "X",
            minPurchase: 30000,
            allowStackWithTier: false,
            validUntil,
            isActive: false,
        });

        expect(repository.createPromoCode).toHaveBeenCalledWith(
            expect.objectContaining({ minPurchase: 30000, allowStackWithTier: false, validUntil, isActive: false }),
        );
    });

    it("generates a code from the random source when none is given", async () => {
        const { repository, service } = setup();

        const promoCode = await service.createPromoCode(BODY);

        expect(promoCode.code).toBe("99999999");
        expect(repository.createPromoCode).toHaveBeenCalledTimes(1);
    });

    it("tries again with a new code when a generated one is taken", async () => {
        const { randomInt, repository, service } = setup();
        let calls = 0;
        randomInt.mockImplementation(() => (calls++ < 8 ? 0 : 1));
        repository.createPromoCode.mockRejectedValueOnce(new PromoCodeAlreadyExistsError());

        const promoCode = await service.createPromoCode(BODY);

        expect(repository.createPromoCode).toHaveBeenCalledTimes(2);
        expect(repository.createPromoCode).toHaveBeenNthCalledWith(1, expect.objectContaining({ code: "AAAAAAAA" }));
        expect(promoCode.code).toBe("BBBBBBBB");
    });

    it("gives up after five clashes", async () => {
        const { repository, service } = setup();
        repository.createPromoCode.mockRejectedValue(new PromoCodeAlreadyExistsError());

        await expect(service.createPromoCode(BODY)).rejects.toBeInstanceOf(PromoCodeGenerationError);
        expect(repository.createPromoCode).toHaveBeenCalledTimes(5);
    });

    it("does not retry other failures while generating", async () => {
        const { repository, service } = setup();
        repository.createPromoCode.mockRejectedValue(new Error("db down"));

        await expect(service.createPromoCode(BODY)).rejects.toThrow("db down");
        expect(repository.createPromoCode).toHaveBeenCalledTimes(1);
    });

    it("lets a conflict on a given code through", async () => {
        const { repository, service } = setup();
        repository.createPromoCode.mockRejectedValue(new PromoCodeAlreadyExistsError());

        await expect(service.createPromoCode({ ...BODY, code: "MERDEKA" })).rejects.toBeInstanceOf(
            PromoCodeAlreadyExistsError,
        );
        expect(repository.createPromoCode).toHaveBeenCalledTimes(1);
    });

    it.each([
        ["a percent above 100", { discountType: "Persen", discountValue: 101 }],
        ["a zero discount", { discountType: "Nominal", discountValue: 0 }],
        ["a validUntil that has passed", { validUntil: Temporal.PlainDateTime.from("2026-11-03T01:00:00") }],
    ] as const)("rejects %s without writing", async (_, override) => {
        const { repository, service } = setup();

        await expect(service.createPromoCode({ ...BODY, code: "X", ...override })).rejects.toBeInstanceOf(
            ValidationError,
        );
        expect(repository.createPromoCode).not.toHaveBeenCalled();
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildPromoCode } from "../test-utils/factory/promo-codes.factory.js";
import { setupPromoCodesController } from "../test-utils/setup/promo-codes.setup.js";

describe("PromoCodesController.createPromoCode (unit)", () => {
    it("passes the body and answers 201 with the code", async () => {
        const { promoCodesService, controller } = setupPromoCodesController();
        const item = buildPromoCode({ code: "MERDEKA" });
        promoCodesService.createPromoCode.mockResolvedValue(item);
        const res = createMockResponse();
        const body = { code: "MERDEKA", discountType: "Persen", discountValue: 20, quota: 10 };

        await controller.createPromoCode(createMockRequest({ body }), res);

        expect(promoCodesService.createPromoCode).toHaveBeenCalledWith(body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

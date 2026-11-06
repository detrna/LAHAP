import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildPromoCode } from "../test-utils/factory/promo-codes.factory.js";
import { setupPromoCodesController } from "../test-utils/setup/promo-codes.setup.js";

describe("PromoCodesController.getPromoCode (unit)", () => {
    it("answers the code by id", async () => {
        const { promoCodesService, controller } = setupPromoCodesController();
        const item = buildPromoCode();
        promoCodesService.getPromoCode.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.getPromoCode(createMockRequest({ params: { id: item.id } }), res);

        expect(promoCodesService.getPromoCode).toHaveBeenCalledWith(item.id);
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

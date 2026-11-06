import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildPromoCode } from "../test-utils/factory/promo-codes.factory.js";
import { setupPromoCodesController } from "../test-utils/setup/promo-codes.setup.js";

describe("PromoCodesController.updatePromoCode (unit)", () => {
    it("passes the id and the body and answers the code", async () => {
        const { promoCodesService, controller } = setupPromoCodesController();
        const item = buildPromoCode({ isActive: false });
        promoCodesService.updatePromoCode.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.updatePromoCode(
            createMockRequest({ params: { id: item.id }, body: { isActive: false } }),
            res,
        );

        expect(promoCodesService.updatePromoCode).toHaveBeenCalledWith(item.id, { isActive: false });
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupPromoCodesController } from "../test-utils/setup/promo-codes.setup.js";

describe("PromoCodesController.deletePromoCode (unit)", () => {
    it("deletes by id and answers 204 with no body", async () => {
        const { promoCodesService, controller } = setupPromoCodesController();
        promoCodesService.deletePromoCode.mockResolvedValue(undefined);
        const res = createMockResponse();

        await controller.deletePromoCode(createMockRequest({ params: { id: "promo" } }), res);

        expect(promoCodesService.deletePromoCode).toHaveBeenCalledWith("promo");
        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.end).toHaveBeenCalled();
    });
});

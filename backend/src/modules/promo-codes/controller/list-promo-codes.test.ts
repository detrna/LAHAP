import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildPromoCode } from "../test-utils/factory/promo-codes.factory.js";
import { setupPromoCodesController } from "../test-utils/setup/promo-codes.setup.js";

describe("PromoCodesController.listPromoCodes (unit)", () => {
    it("passes the filters and the pagination and answers a page", async () => {
        const { promoCodesService, controller } = setupPromoCodesController();
        const items = [buildPromoCode()];
        promoCodesService.listPromoCodes.mockResolvedValue({ items, total: 1 });
        const res = createMockResponse();

        await controller.listPromoCodes(
            createMockRequest({
                query: { search: "hem", isActive: false },
                pagination: { page: 2, limit: 10, offset: 10, skip: 10, take: 10 },
            }),
            res,
        );

        expect(promoCodesService.listPromoCodes).toHaveBeenCalledWith({
            search: "hem",
            isActive: false,
            skip: 10,
            take: 10,
        });
        expect(res.json).toHaveBeenCalledWith({ data: items, meta: expect.objectContaining({ total: 1 }) });
    });

    it("leaves out filters that were not sent", async () => {
        const { promoCodesService, controller } = setupPromoCodesController();
        promoCodesService.listPromoCodes.mockResolvedValue({ items: [], total: 0 });

        await controller.listPromoCodes(
            createMockRequest({ pagination: { page: 1, limit: 20, offset: 0, skip: 0, take: 20 } }),
            createMockResponse(),
        );

        expect(promoCodesService.listPromoCodes).toHaveBeenCalledWith({ skip: 0, take: 20 });
    });
});

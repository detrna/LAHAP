import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { setupOrdersController } from "../../test-utils/setup/orders.setup.js";

describe("OrdersController.previewCheckout (unit)", () => {
    it("previews the signed-in customer's order", async () => {
        const { controller, ordersService } = setupOrdersController();
        const preview = { totalPrice: 30000 };
        ordersService.previewCheckout.mockResolvedValue(preview);
        const body = { period: "Harian" };
        const req = createMockRequest({ body, user: { userId: "user-1", name: "Budi", role: "CUSTOMER" } });
        const res = createMockResponse();

        await controller.previewCheckout(req, res);

        expect(ordersService.previewCheckout).toHaveBeenCalledWith("user-1", body);
        expect(res.json).toHaveBeenCalledWith({ data: preview });
    });
});

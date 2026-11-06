import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { setupOrdersController } from "../../test-utils/setup/orders.setup.js";

describe("OrdersController.getPaymentSession (unit)", () => {
    it("returns the customer's payment session for the subscription", async () => {
        const { controller, ordersService } = setupOrdersController();
        const session = { snapToken: "snap" };
        ordersService.getPaymentSession.mockResolvedValue(session);
        const req = createMockRequest({
            params: { id: "sub-1" },
            user: { userId: "user-1", name: "Budi", role: "CUSTOMER" },
        });
        const res = createMockResponse();

        await controller.getPaymentSession(req, res);

        expect(ordersService.getPaymentSession).toHaveBeenCalledWith("user-1", "sub-1");
        expect(res.json).toHaveBeenCalledWith({ data: session });
    });
});

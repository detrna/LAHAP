import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { setupOrdersController } from "../../test-utils/setup/orders.setup.js";

describe("OrdersController.createSubscription (unit)", () => {
    it("creates the signed-in customer's order and answers 201", async () => {
        const { controller, ordersService } = setupOrdersController();
        const result = { subscription: { id: "sub-1" } };
        ordersService.createSubscription.mockResolvedValue(result);
        const body = { period: "Harian" };
        const req = createMockRequest({ body, user: { userId: "user-1", name: "Budi", role: "CUSTOMER" } });
        const res = createMockResponse();

        await controller.createSubscription(req, res);

        expect(ordersService.createSubscription).toHaveBeenCalledWith("user-1", body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: result });
    });
});

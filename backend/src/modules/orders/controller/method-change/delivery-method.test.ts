import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../../tests/utils/mocks/express.js";
import { setupOrdersController } from "../../test-utils/setup/orders.setup.js";

const customer = { userId: "user-1", name: "Budi", role: "CUSTOMER" as const };
const admin = { userId: "admin-1", name: "Admin", role: "ADMIN" as const };
const body = { isDelivery: false, paymentMethod: "MIDTRANS" };

describe("OrdersController delivery method changes (unit)", () => {
    it("previews a switch for the signed-in customer or an admin", async () => {
        const { controller, ordersService } = setupOrdersController();
        ordersService.previewMethodChange.mockResolvedValue({ amount: 4000 });

        const res = createMockResponse();
        await controller.previewMethodChange(createMockRequest({ body, params: { id: "sub-1" }, user: customer }), res);
        await controller.previewMethodChangeForAdmin(
            createMockRequest({ body, params: { id: "sub-1" }, user: admin }),
            createMockResponse(),
        );

        expect(ordersService.previewMethodChange).toHaveBeenNthCalledWith(
            1,
            { userId: "user-1", asAdmin: false },
            "sub-1",
            body,
        );
        expect(ordersService.previewMethodChange).toHaveBeenNthCalledWith(
            2,
            { userId: "admin-1", asAdmin: true },
            "sub-1",
            body,
        );
        expect(res.json).toHaveBeenCalledWith({ data: { amount: 4000 } });
    });

    it("answers 201 with the change for the customer and for an admin", async () => {
        const { controller, ordersService } = setupOrdersController();
        ordersService.changeDeliveryMethod.mockResolvedValue({ change: { id: "chg-1" } });

        const res = createMockResponse();
        await controller.changeDeliveryMethod(
            createMockRequest({ body, params: { id: "sub-1" }, user: customer }),
            res,
        );
        await controller.changeDeliveryMethodForAdmin(
            createMockRequest({ body, params: { id: "sub-1" }, user: admin }),
            createMockResponse(),
        );

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: { change: { id: "chg-1" } } });
        expect(ordersService.changeDeliveryMethod).toHaveBeenLastCalledWith(
            { userId: "admin-1", asAdmin: true },
            "sub-1",
            body,
        );
    });

    it("reopens the payment session of a change", async () => {
        const { controller, ordersService } = setupOrdersController();
        ordersService.getMethodChangePaymentSession.mockResolvedValue({ snapToken: "snap" });
        const res = createMockResponse();

        await controller.getMethodChangePaymentSession(
            createMockRequest({ params: { id: "chg-1" }, user: customer }),
            res,
        );

        expect(ordersService.getMethodChangePaymentSession).toHaveBeenCalledWith("user-1", "chg-1");
        expect(res.json).toHaveBeenCalledWith({ data: { snapToken: "snap" } });
    });

    it("pages the admin list and confirms a refund", async () => {
        const { controller, ordersService } = setupOrdersController();
        ordersService.listMethodChangesForAdmin.mockResolvedValue({ items: [{ id: "chg-1" }], total: 1 });
        ordersService.confirmMethodChangeRefund.mockResolvedValue({ id: "chg-1", needsRefund: false });
        const list = createMockResponse();
        const confirm = createMockResponse();

        await controller.listMethodChangesForAdmin(
            createMockRequest({
                query: { needsRefund: true },
                pagination: { page: 2, limit: 10, offset: 10, skip: 10, take: 10 },
                user: admin,
            }),
            list,
        );
        await controller.confirmMethodChangeRefund(
            createMockRequest({ params: { id: "chg-1" }, user: admin }),
            confirm,
        );

        expect(ordersService.listMethodChangesForAdmin).toHaveBeenCalledWith({ needsRefund: true, skip: 10, take: 10 });
        expect(list.json).toHaveBeenCalledWith({
            data: [{ id: "chg-1" }],
            meta: expect.objectContaining({ page: 2, limit: 10, total: 1 }),
        });
        expect(ordersService.confirmMethodChangeRefund).toHaveBeenCalledWith("chg-1");
        expect(confirm.json).toHaveBeenCalledWith({ data: { id: "chg-1", needsRefund: false } });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildCourierDelivery } from "../test-utils/factory/delivery.factory.js";
import { setupDeliveryController } from "../test-utils/setup/delivery.setup.js";

const courier = { userId: "c-1", name: "Budi", role: "COURIER" } as const;

describe("DeliveryController.listMyDeliveries (unit)", () => {
    it("lists the signed-in courier's deliveries for the date in the query", async () => {
        const { deliveryService, controller } = setupDeliveryController();
        const deliveries = [buildCourierDelivery()];
        deliveryService.listMyDeliveries.mockResolvedValue(deliveries);
        const date = Temporal.PlainDate.from("2026-11-09");
        const res = createMockResponse();

        await controller.listMyDeliveries(createMockRequest({ user: courier, query: { date } }), res);

        expect(deliveryService.listMyDeliveries).toHaveBeenCalledWith("c-1", date);
        expect(res.json).toHaveBeenCalledWith({ data: deliveries });
    });

    it("leaves the date to the service when the query has none", async () => {
        const { deliveryService, controller } = setupDeliveryController();

        await controller.listMyDeliveries(createMockRequest({ user: courier, query: {} }), createMockResponse());

        expect(deliveryService.listMyDeliveries).toHaveBeenCalledWith("c-1", undefined);
    });
});

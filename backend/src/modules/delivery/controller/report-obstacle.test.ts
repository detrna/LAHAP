import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildDeliveryObstacle } from "../test-utils/factory/delivery.factory.js";
import { setupDeliveryController } from "../test-utils/setup/delivery.setup.js";

describe("DeliveryController.reportObstacle (unit)", () => {
    it("saves the note as the signed-in user and answers 201 with the obstacle", async () => {
        const { deliveryService, controller } = setupDeliveryController();
        const obstacle = buildDeliveryObstacle();
        deliveryService.reportObstacle.mockResolvedValue(obstacle);
        const res = createMockResponse();
        res.status.mockReturnValue(res);

        await controller.reportObstacle(
            createMockRequest({
                user: { userId: "a-1", name: "Owner", role: "ADMIN" },
                params: { id: "o-1" },
                body: { note: "Gerbang terkunci", photoKey: "obstacles/2026/11/a.webp" },
            }),
            res,
        );

        expect(deliveryService.reportObstacle).toHaveBeenCalledWith({ userId: "a-1", role: "ADMIN" }, "o-1", {
            note: "Gerbang terkunci",
            photoKey: "obstacles/2026/11/a.webp",
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: obstacle });
    });
});

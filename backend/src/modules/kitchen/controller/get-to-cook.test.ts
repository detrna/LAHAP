import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildToCookReport } from "../test-utils/factory/kitchen.factory.js";
import { setupKitchenController } from "../test-utils/setup/kitchen.setup.js";

describe("KitchenController.getToCook (unit)", () => {
    it("passes the validated query and answers the reports", async () => {
        const { kitchenService, controller } = setupKitchenController();
        const reports = [buildToCookReport()];
        kitchenService.getToCook.mockResolvedValue(reports);
        const query = {
            from: Temporal.PlainDate.from("2026-11-09"),
            to: Temporal.PlainDate.from("2026-11-10"),
            deliveryTime: Temporal.PlainTime.from("07:00"),
            packageId: "p-1",
        };
        const res = createMockResponse();

        await controller.getToCook(createMockRequest({ query }), res);

        expect(kitchenService.getToCook).toHaveBeenCalledWith(query);
        expect(res.json).toHaveBeenCalledWith({ data: reports });
    });

    it("passes nothing for filters that were not sent", async () => {
        const { kitchenService, controller } = setupKitchenController();
        kitchenService.getToCook.mockResolvedValue([]);

        await controller.getToCook(createMockRequest({ query: {} }), createMockResponse());

        expect(kitchenService.getToCook).toHaveBeenCalledWith({});
    });
});

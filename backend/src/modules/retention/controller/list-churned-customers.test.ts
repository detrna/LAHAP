import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildChurnCustomer } from "../test-utils/factory/retention.factory.js";
import { setupRetentionController } from "../test-utils/setup/retention.setup.js";

describe("RetentionController.listChurnedCustomers (unit)", () => {
    it("passes the search and the pagination and answers a page", async () => {
        const { retentionService, controller } = setupRetentionController();
        const items = [buildChurnCustomer()];
        retentionService.listChurnedCustomers.mockResolvedValue({ items, total: 1 });
        const res = createMockResponse();

        await controller.listChurnedCustomers(
            createMockRequest({
                query: { search: "budi" },
                pagination: { page: 1, limit: 20, offset: 0, skip: 0, take: 20 },
            }),
            res,
        );

        expect(retentionService.listChurnedCustomers).toHaveBeenCalledWith({ search: "budi", skip: 0, take: 20 });
        expect(res.json).toHaveBeenCalledWith({ data: items, meta: expect.objectContaining({ total: 1 }) });
    });

    it("leaves the search out when it was not sent", async () => {
        const { retentionService, controller } = setupRetentionController();
        retentionService.listChurnedCustomers.mockResolvedValue({ items: [], total: 0 });

        await controller.listChurnedCustomers(
            createMockRequest({ pagination: { page: 1, limit: 20, offset: 0, skip: 0, take: 20 } }),
            createMockResponse(),
        );

        expect(retentionService.listChurnedCustomers).toHaveBeenCalledWith({ skip: 0, take: 20 });
    });
});

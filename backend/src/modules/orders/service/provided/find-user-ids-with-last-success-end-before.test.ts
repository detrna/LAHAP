import { describe, expect, it } from "vitest";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService.findUserIdsWithLastSuccessEndBefore (unit)", () => {
    it("passes the date to the repository", async () => {
        const { repository, service } = setupOrdersService();
        repository.findUserIdsWithLastSuccessEndBefore.mockResolvedValue(["a"]);
        const date = Temporal.PlainDate.from("2026-10-20");

        expect(await service.findUserIdsWithLastSuccessEndBefore(date)).toEqual(["a"]);
        expect(repository.findUserIdsWithLastSuccessEndBefore).toHaveBeenCalledWith(date);
    });
});

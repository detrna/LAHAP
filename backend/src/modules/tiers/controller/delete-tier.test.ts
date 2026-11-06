import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupTiersController } from "../test-utils/setup/tiers.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";

describe("TiersController.deleteTier (unit)", () => {
    it("deletes by id and answers 204 with no body", async () => {
        const { tiersService, controller } = setupTiersController();
        tiersService.deleteTier.mockResolvedValue(undefined);
        const res = createMockResponse();

        await controller.deleteTier(createMockRequest({ params: { id: ID } }), res);

        expect(tiersService.deleteTier).toHaveBeenCalledWith(ID);
        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.end).toHaveBeenCalled();
    });
});

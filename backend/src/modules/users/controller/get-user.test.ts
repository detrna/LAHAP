import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildUser } from "../test-utils/factory/users.factory.js";
import { setupUsersController } from "../test-utils/setup/users.setup.js";

describe("UsersController.getUser (unit)", () => {
    it("answers with the user detail", async () => {
        const { usersService, controller } = setupUsersController();
        const detail = buildUser({ isChurned: false });
        usersService.getUser.mockResolvedValue(detail);
        const res = createMockResponse();

        await controller.getUser(createMockRequest({ params: { id: detail.id } }), res);

        expect(usersService.getUser).toHaveBeenCalledWith(detail.id);
        expect(res.json).toHaveBeenCalledWith({ data: detail });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildUser } from "../test-utils/factory/users.factory.js";
import { setupUsersController } from "../test-utils/setup/users.setup.js";

describe("UsersController.updateUser (unit)", () => {
    it("updates the user and answers with the detail", async () => {
        const { usersService, controller } = setupUsersController();
        const detail = buildUser({ isActive: false });
        usersService.updateUser.mockResolvedValue(detail);
        const res = createMockResponse();

        await controller.updateUser(createMockRequest({ params: { id: detail.id }, body: { isActive: false } }), res);

        expect(usersService.updateUser).toHaveBeenCalledWith(detail.id, { isActive: false });
        expect(res.json).toHaveBeenCalledWith({ data: detail });
    });
});

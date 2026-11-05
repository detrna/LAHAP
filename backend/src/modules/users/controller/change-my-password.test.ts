import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildUser } from "../test-utils/factory/users.factory.js";
import { setupUsersController } from "../test-utils/setup/users.setup.js";

const user = { userId: buildUser().id, name: "Rina", role: "CUSTOMER" } as const;

describe("UsersController.changeMyPassword (unit)", () => {
    it("changes the password and answers 204 without a body", async () => {
        const { usersService, controller } = setupUsersController();
        const body = { currentPassword: "old-password", newPassword: "new-password" };
        const res = createMockResponse();

        await controller.changeMyPassword(createMockRequest({ user, body }), res);

        expect(usersService.changePassword).toHaveBeenCalledWith(user.userId, body);
        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.end).toHaveBeenCalled();
    });
});

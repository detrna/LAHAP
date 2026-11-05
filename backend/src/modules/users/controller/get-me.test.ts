import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildUser } from "../test-utils/factory/users.factory.js";
import { setupUsersController } from "../test-utils/setup/users.setup.js";

const user = { userId: buildUser().id, name: "Rina", role: "CUSTOMER" } as const;

describe("UsersController.getMe (unit)", () => {
    it("answers with the signed-in user's profile", async () => {
        const { usersService, controller } = setupUsersController();
        const profile = buildUser();
        usersService.getProfile.mockResolvedValue(profile);
        const res = createMockResponse();

        await controller.getMe(createMockRequest({ user }), res);

        expect(usersService.getProfile).toHaveBeenCalledWith(user.userId);
        expect(res.json).toHaveBeenCalledWith({ data: profile });
    });
});

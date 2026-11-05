import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildUser } from "../test-utils/factory/users.factory.js";
import { setupUsersController } from "../test-utils/setup/users.setup.js";

const user = { userId: buildUser().id, name: "Rina", role: "CUSTOMER" } as const;

describe("UsersController.updateMe (unit)", () => {
    it("updates the signed-in user's profile", async () => {
        const { usersService, controller } = setupUsersController();
        const profile = buildUser({ name: "Rina" });
        usersService.updateProfile.mockResolvedValue(profile);
        const res = createMockResponse();

        await controller.updateMe(createMockRequest({ user, body: { name: "Rina" } }), res);

        expect(usersService.updateProfile).toHaveBeenCalledWith(user.userId, { name: "Rina" });
        expect(res.json).toHaveBeenCalledWith({ data: profile });
    });
});

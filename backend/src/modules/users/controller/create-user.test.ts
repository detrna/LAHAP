import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildUser } from "../test-utils/factory/users.factory.js";
import { setupUsersController } from "../test-utils/setup/users.setup.js";

describe("UsersController.createUser (unit)", () => {
    it("answers 201 with the new user", async () => {
        const { usersService, controller } = setupUsersController();
        const created = buildUser({ role: "COURIER" });
        usersService.createUser.mockResolvedValue(created);
        const body = { phone: "6281234567890", password: "password123", role: "COURIER" };
        const res = createMockResponse();

        await controller.createUser(createMockRequest({ body }), res);

        expect(usersService.createUser).toHaveBeenCalledWith(body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: created });
    });
});

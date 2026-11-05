import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildUser } from "../test-utils/factory/users.factory.js";
import { setupUsersController } from "../test-utils/setup/users.setup.js";

describe("UsersController.listUsers (unit)", () => {
    it("passes the filters and pagination, and answers a paginated page", async () => {
        const { usersService, controller } = setupUsersController();
        const items = [buildUser()];
        usersService.listUsers.mockResolvedValue({ items, total: 21 });
        const res = createMockResponse();

        await controller.listUsers(
            createMockRequest({
                query: { search: "rina", role: ["KITCHEN"], isActive: true, page: 2, limit: 10 },
                pagination: { page: 2, limit: 10, offset: 10, skip: 10, take: 10 },
            }),
            res,
        );

        expect(usersService.listUsers).toHaveBeenCalledWith({
            search: "rina",
            roles: ["KITCHEN"],
            isActive: true,
            isChurned: undefined,
            skip: 10,
            take: 10,
        });
        expect(res.json).toHaveBeenCalledWith({
            data: items,
            meta: expect.objectContaining({ page: 2, limit: 10, total: 21, totalPages: 3 }),
        });
    });
});

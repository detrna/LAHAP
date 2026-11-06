import { describe, expect, it } from "vitest";
import { setupUsersService } from "../test-utils/setup/users.setup.js";

describe("UsersService.countActiveUsers (unit)", () => {
    it("counts the active users of the role", async () => {
        const { repository, service } = setupUsersService();
        repository.countActiveUsers.mockResolvedValue(7);

        expect(await service.countActiveUsers("CUSTOMER")).toBe(7);
        expect(repository.countActiveUsers).toHaveBeenCalledWith("CUSTOMER");
    });
});

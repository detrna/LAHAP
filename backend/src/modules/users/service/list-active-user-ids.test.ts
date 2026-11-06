import { describe, expect, it } from "vitest";
import { setupUsersService } from "../test-utils/setup/users.setup.js";

describe("UsersService.listActiveUserIds (unit)", () => {
    it("asks the repository for the active users of the role", async () => {
        const { repository, service } = setupUsersService();
        repository.listActiveUserIds.mockResolvedValue(["a", "b"]);

        expect(await service.listActiveUserIds("ADMIN")).toEqual(["a", "b"]);
        expect(repository.listActiveUserIds).toHaveBeenCalledWith("ADMIN");
    });
});

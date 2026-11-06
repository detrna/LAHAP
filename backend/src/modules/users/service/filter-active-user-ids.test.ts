import { describe, expect, it } from "vitest";
import { setupUsersService } from "../test-utils/setup/users.setup.js";

describe("UsersService.filterActiveUserIds (unit)", () => {
    it("keeps the ids the repository finds, asking once per distinct id", async () => {
        const { repository, service } = setupUsersService();
        repository.filterActiveUserIds.mockResolvedValue(["a"]);

        expect(await service.filterActiveUserIds(["a", "b", "a"], "CUSTOMER")).toEqual(["a"]);
        expect(repository.filterActiveUserIds).toHaveBeenCalledWith(["a", "b"], "CUSTOMER");
    });

    it("answers an empty list without a query", async () => {
        const { repository, service } = setupUsersService();

        expect(await service.filterActiveUserIds([], "CUSTOMER")).toEqual([]);
        expect(repository.filterActiveUserIds).not.toHaveBeenCalled();
    });
});

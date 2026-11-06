import { describe, expect, it } from "vitest";
import { buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";

describe("UsersService.getAllergyProfiles (unit)", () => {
    it("returns each user's allergy ids and note, asking once per distinct id", async () => {
        const { repository, service } = setupUsersService();
        repository.findByIds.mockResolvedValue([
            buildUserRecord({ id: "a", allergyIds: ["egg"], allergyNote: "udang" }),
        ]);

        expect(await service.getAllergyProfiles(["a", "a", "b"])).toEqual([
            { userId: "a", allergyIds: ["egg"], allergyNote: "udang" },
        ]);
        expect(repository.findByIds).toHaveBeenCalledWith(["a", "b"]);
    });

    it("answers an empty list without a query", async () => {
        const { repository, service } = setupUsersService();

        expect(await service.getAllergyProfiles([])).toEqual([]);
        expect(repository.findByIds).not.toHaveBeenCalled();
    });
});

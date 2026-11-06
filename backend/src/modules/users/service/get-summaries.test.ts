import { describe, expect, it } from "vitest";
import { buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";

describe("UsersService.getSummaries (unit)", () => {
    it("returns the summary of every found user, asking once per distinct id", async () => {
        const { repository, service } = setupUsersService();
        repository.findByIds.mockResolvedValue([
            buildUserRecord({ id: "c", name: "Kurir", phone: "628111", role: "COURIER", isActive: false }),
        ]);

        expect(await service.getSummaries(["c", "c"])).toEqual([
            { id: "c", name: "Kurir", phone: "628111", role: "COURIER" },
        ]);
        expect(repository.findByIds).toHaveBeenCalledWith(["c"]);
    });

    it("answers an empty list without a query", async () => {
        const { repository, service } = setupUsersService();

        expect(await service.getSummaries([])).toEqual([]);
        expect(repository.findByIds).not.toHaveBeenCalled();
    });
});

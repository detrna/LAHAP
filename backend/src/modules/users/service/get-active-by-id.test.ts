import { describe, expect, it } from "vitest";
import { buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";

describe("UsersService.getActiveById (unit)", () => {
    it("returns the user when they exist and are active", async () => {
        const { repository, service } = setupUsersService();
        repository.findById.mockResolvedValue(buildUserRecord({ name: "Rina" }));

        expect(await service.getActiveById("00000000-0000-4000-8000-000000000001")).toMatchObject({ name: "Rina" });
        expect(repository.findById).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001");
    });

    it("returns null when the user is missing or inactive", async () => {
        const { repository, service } = setupUsersService();

        expect(await service.getActiveById("missing")).toBeNull();

        repository.findById.mockResolvedValue(buildUserRecord({ isActive: false }));
        expect(await service.getActiveById("inactive")).toBeNull();
    });
});

import { describe, expect, it } from "vitest";
import { buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";

describe("UsersService.updateProfile (unit)", () => {
    it("applies the changes and returns the profile with its membership", async () => {
        const { repository, sessionRevoker, service } = setupUsersService();
        repository.findById.mockResolvedValue(buildUserRecord());
        repository.update.mockResolvedValue(buildUserRecord({ name: "Rina" }));

        const user = await service.updateProfile(buildUserRecord().id, { name: "Rina" });

        expect(user).toMatchObject({ name: "Rina", membership: null });
        expect(user).not.toHaveProperty("isChurned");
        expect(sessionRevoker.revokeSessionsOfUser).not.toHaveBeenCalled();
    });
});

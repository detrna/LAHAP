import { describe, expect, it } from "vitest";
import { buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";
import { UserNotFoundError } from "./interfaces/users.repository.js";

describe("UsersService.getProfile (unit)", () => {
    it("returns the user with their membership", async () => {
        const { repository, service } = setupUsersService();
        repository.findById.mockResolvedValue(buildUserRecord({ name: "Rina" }));

        expect(await service.getProfile(buildUserRecord().id)).toMatchObject({ name: "Rina", membership: null });
    });

    it("gives 404 when the user no longer exists", async () => {
        const { service } = setupUsersService();

        await expect(service.getProfile(buildUserRecord().id)).rejects.toBeInstanceOf(UserNotFoundError);
    });
});

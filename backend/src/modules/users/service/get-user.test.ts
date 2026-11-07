import { describe, expect, it } from "vitest";
import { buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";
import { UserNotFoundError } from "../../../shared/errors/user-not-found-error.js";

describe("UsersService.getUser (unit)", () => {
    it("returns the detail with membership and churn data", async () => {
        const { repository, service } = setupUsersService();
        repository.findById.mockResolvedValue(buildUserRecord());

        expect(await service.getUser(buildUserRecord().id)).toMatchObject({ membership: null, isChurned: false });
    });

    it("gives 404 for an unknown id", async () => {
        const { service } = setupUsersService();

        await expect(service.getUser(buildUserRecord().id)).rejects.toMatchObject({
            constructor: UserNotFoundError,
            statusCode: 404,
        });
    });
});

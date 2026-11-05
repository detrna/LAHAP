import { describe, expect, it } from "vitest";
import { buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";

const USER_ID = buildUserRecord().id;

function setup() {
    const context = setupUsersService();
    context.repository.findById.mockResolvedValue(buildUserRecord());
    context.repository.update.mockResolvedValue(buildUserRecord());
    return context;
}

describe("UsersService.updateUser (unit)", () => {
    it("returns the detail with membership and churn data", async () => {
        const { service } = setup();

        expect(await service.updateUser(USER_ID, { role: "COURIER" })).toMatchObject({
            membership: null,
            isChurned: false,
        });
    });

    it("revokes the user's sessions after a password reset or a deactivation", async () => {
        const { sessionRevoker, service } = setup();

        await service.updateUser(USER_ID, { password: "new-password" });
        await service.updateUser(USER_ID, { isActive: false });

        expect(sessionRevoker.revokeSessionsOfUser).toHaveBeenCalledTimes(2);
        expect(sessionRevoker.revokeSessionsOfUser).toHaveBeenCalledWith(USER_ID);
    });

    it("keeps the sessions for other changes", async () => {
        const { sessionRevoker, service } = setup();

        await service.updateUser(USER_ID, { name: "Rina", isActive: true });

        expect(sessionRevoker.revokeSessionsOfUser).not.toHaveBeenCalled();
    });
});

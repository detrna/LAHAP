import { describe, expect, it } from "vitest";
import { InvalidStateError } from "../../../shared/errors/invalid-state-error.js";
import { ValidationError } from "../../../shared/errors/validation-error.js";
import { buildUserCredentialsRecord, buildUserRecord } from "../test-utils/factory/users.factory.js";
import { setupUsersService } from "../test-utils/setup/users.setup.js";
import { UserNotFoundError } from "../../../shared/errors/user-not-found-error.js";

const USER_ID = buildUserRecord().id;

function setup() {
    const context = setupUsersService();
    context.repository.findCredentialsById.mockResolvedValue(
        buildUserCredentialsRecord({ passwordHash: "hashed:old-password" }),
    );
    return context;
}

describe("UsersService.changePassword (unit)", () => {
    it("saves the new hash and revokes the user's sessions", async () => {
        const { repository, sessionRevoker, service } = setup();

        await service.changePassword(USER_ID, { currentPassword: "old-password", newPassword: "new-password" });

        expect(repository.updatePasswordHash).toHaveBeenCalledWith(USER_ID, "hashed:new-password");
        expect(sessionRevoker.revokeSessionsOfUser).toHaveBeenCalledWith(USER_ID);
    });

    it("gives 422 for a wrong current password", async () => {
        const { repository, sessionRevoker, service } = setup();

        const attempt = service.changePassword(USER_ID, { currentPassword: "wrong", newPassword: "new-password" });

        await expect(attempt).rejects.toBeInstanceOf(InvalidStateError);
        await expect(attempt).rejects.toMatchObject({ message: "current password is incorrect", statusCode: 422 });
        expect(repository.updatePasswordHash).not.toHaveBeenCalled();
        expect(sessionRevoker.revokeSessionsOfUser).not.toHaveBeenCalled();
    });

    it("gives 400 on newPassword when it equals the current one", async () => {
        const { repository, service } = setup();

        const attempt = service.changePassword(USER_ID, {
            currentPassword: "old-password",
            newPassword: "old-password",
        });

        await expect(attempt).rejects.toBeInstanceOf(ValidationError);
        await expect(attempt).rejects.toMatchObject({ issues: [{ target: "body", path: "newPassword" }] });
        expect(repository.updatePasswordHash).not.toHaveBeenCalled();
    });

    it("gives 404 when the user no longer exists", async () => {
        const { repository, service } = setup();
        repository.findCredentialsById.mockResolvedValueOnce(null);
        repository.updatePasswordHash.mockResolvedValueOnce(false);

        const input = { currentPassword: "old-password", newPassword: "new-password" };
        await expect(service.changePassword(USER_ID, input)).rejects.toBeInstanceOf(UserNotFoundError);
        await expect(service.changePassword(USER_ID, input)).rejects.toBeInstanceOf(UserNotFoundError);
    });
});

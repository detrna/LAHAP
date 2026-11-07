import { InvalidStateError } from "../../../shared/errors/invalid-state-error.js";
import { ValidationError } from "../../../shared/errors/validation-error.js";
import { UserNotFoundError } from "../../../shared/errors/user-not-found-error.js";
import type { UsersService } from "./users.service.js";

export interface ChangePasswordInput {
    readonly currentPassword: string;
    readonly newPassword: string;
}

export async function changePassword(this: UsersService, userId: string, input: ChangePasswordInput): Promise<void> {
    const credentials = await this.usersRepository.findCredentialsById(userId);
    if (credentials === null) throw new UserNotFoundError(userId);

    if (!(await this.hasher.compare(input.currentPassword, credentials.passwordHash))) {
        throw new InvalidStateError("current password is incorrect");
    }
    if (await this.hasher.compare(input.newPassword, credentials.passwordHash)) {
        throw new ValidationError([
            {
                target: "body",
                path: "newPassword",
                message: "must differ from the current password",
                code: "custom",
            },
        ]);
    }

    if (!(await this.usersRepository.updatePasswordHash(userId, await this.hasher.hash(input.newPassword)))) {
        throw new UserNotFoundError(userId);
    }
    await this.sessionRevoker?.revokeSessionsOfUser(userId);
}

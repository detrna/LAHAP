import type { User } from "../domain/user.domain.js";
import type { UserChangesInput } from "./apply-user-changes.js";
import type { UsersService } from "./users.service.js";

export async function updateUser(this: UsersService, id: string, input: UserChangesInput): Promise<User> {
    const record = await this.applyUserChanges(id, input);
    if (input.password !== undefined || input.isActive === false) {
        await this.sessionRevoker?.revokeSessionsOfUser(id);
    }
    return this.toUserDetail(record);
}

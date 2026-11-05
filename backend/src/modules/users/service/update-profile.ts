import type { User } from "../domain/user.domain.js";
import type { ProfileChangesInput } from "./apply-user-changes.js";
import type { UsersService } from "./users.service.js";

export async function updateProfile(this: UsersService, userId: string, input: ProfileChangesInput): Promise<User> {
    return this.toProfile(await this.applyUserChanges(userId, input));
}

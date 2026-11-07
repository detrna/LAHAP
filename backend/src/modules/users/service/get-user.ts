import type { User } from "../domain/user.domain.js";
import { UserNotFoundError } from "../../../shared/errors/user-not-found-error.js";
import type { UsersService } from "./users.service.js";

export async function getUser(this: UsersService, id: string): Promise<User> {
    const record = await this.usersRepository.findById(id);
    if (record === null) throw new UserNotFoundError(id);
    return this.toUserDetail(record);
}

import type { User } from "../domain/user.domain.js";
import { UserNotFoundError } from "./interfaces/users.repository.js";
import type { UsersService } from "./users.service.js";

export async function getProfile(this: UsersService, userId: string): Promise<User> {
    const record = await this.usersRepository.findById(userId);
    if (record === null) throw new UserNotFoundError(userId);
    return this.toProfile(record);
}

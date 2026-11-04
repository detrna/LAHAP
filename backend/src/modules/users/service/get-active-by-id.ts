import type { User } from "../domain/user.domain.js";
import { toUser } from "./to-user.js";
import type { UsersService } from "./users.service.js";

export async function getActiveById(this: UsersService, id: string): Promise<User | null> {
    const record = await this.usersRepository.findById(id);
    return record !== null && record.isActive ? toUser(record) : null;
}

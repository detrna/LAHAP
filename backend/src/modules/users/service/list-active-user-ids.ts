import type { Role } from "../../../shared/auth/roles.js";
import type { UsersService } from "./users.service.js";

export async function listActiveUserIds(this: UsersService, role: Role): Promise<readonly string[]> {
    return this.usersRepository.listActiveUserIds(role);
}

import type { Role } from "../../../shared/auth/roles.js";
import type { UsersService } from "./users.service.js";

export async function countActiveUsers(this: UsersService, role: Role): Promise<number> {
    return this.usersRepository.countActiveUsers(role);
}

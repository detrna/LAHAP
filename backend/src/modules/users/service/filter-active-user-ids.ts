import type { Role } from "../../../shared/auth/roles.js";
import type { UsersService } from "./users.service.js";

export async function filterActiveUserIds(
    this: UsersService,
    ids: readonly string[],
    role: Role,
): Promise<readonly string[]> {
    if (ids.length === 0) return [];
    return this.usersRepository.filterActiveUserIds([...new Set(ids)], role);
}

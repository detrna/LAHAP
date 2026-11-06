import type { UserSummary } from "../domain/user.domain.js";
import type { UsersService } from "./users.service.js";

export async function getSummaries(this: UsersService, ids: readonly string[]): Promise<readonly UserSummary[]> {
    if (ids.length === 0) return [];
    const records = await this.usersRepository.findByIds([...new Set(ids)]);
    return records.map(({ id, name, phone, role }) => ({ id, name, phone, role }));
}

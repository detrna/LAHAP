import type { UsersService } from "./users.service.js";

export interface AllergyProfile {
    readonly userId: string;
    readonly allergyIds: readonly string[];
    readonly allergyNote: string | null;
}

export async function getAllergyProfiles(
    this: UsersService,
    ids: readonly string[],
): Promise<readonly AllergyProfile[]> {
    if (ids.length === 0) return [];
    const records = await this.usersRepository.findByIds([...new Set(ids)]);
    return records.map(record => ({
        userId: record.id,
        allergyIds: record.allergyIds,
        allergyNote: record.allergyNote,
    }));
}

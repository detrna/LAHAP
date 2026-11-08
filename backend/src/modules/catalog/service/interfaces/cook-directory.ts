import type { Role } from "../../../../shared/auth/roles.js";
import type { UserSummary } from "../../../users/domain/user.domain.js";

export interface CookDirectory {
    filterActiveUserIds(ids: readonly string[], role: Role): Promise<readonly string[]>;
    getSummaries(ids: readonly string[]): Promise<readonly UserSummary[]>;
}

export const noCookDirectory: CookDirectory = {
    filterActiveUserIds: async () => [],
    getSummaries: async () => [],
};

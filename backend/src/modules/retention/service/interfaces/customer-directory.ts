import type { Role } from "../../../../shared/auth/roles.js";
import type { UserSummary } from "../../../users/domain/user.domain.js";

export interface CustomerDirectory {
    getSummaries(ids: readonly string[]): Promise<readonly UserSummary[]>;
    filterActiveUserIds(ids: readonly string[], role: Role): Promise<readonly string[]>;
}

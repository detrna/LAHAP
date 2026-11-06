import type { Role } from "../../../../shared/auth/roles.js";

export interface RecipientDirectory {
    listActiveUserIds(role: Role): Promise<readonly string[]>;
    countActiveUsers(role: Role): Promise<number>;
    filterActiveUserIds(ids: readonly string[], role: Role): Promise<readonly string[]>;
}

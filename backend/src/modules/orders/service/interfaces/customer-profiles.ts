import type { Role } from "../../../../shared/auth/roles.js";
import type { UserSummary } from "../../../users/domain/user.domain.js";

export interface CustomerAllergyProfile {
    readonly userId: string;
    readonly allergyIds: readonly string[];
    readonly allergyNote: string | null;
}

export interface CustomerProfiles {
    getAllergyProfiles(ids: readonly string[]): Promise<readonly CustomerAllergyProfile[]>;
    filterActiveUserIds(ids: readonly string[], role: Role): Promise<readonly string[]>;
    getSummaries(ids: readonly string[]): Promise<readonly UserSummary[]>;
}

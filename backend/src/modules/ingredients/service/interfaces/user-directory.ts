import type { UserSummary } from "../../../users/domain/user.domain.js";

export interface UserDirectory {
    getSummaries(ids: readonly string[]): Promise<readonly UserSummary[]>;
}

export const noUserDirectory: UserDirectory = {
    getSummaries: async () => [],
};

import type { ChurnCandidate } from "../../domain/churn-list.js";

export interface ChurnHistory {
    findChurnedCustomers(cutoffDate: Temporal.PlainDate): Promise<readonly ChurnCandidate[]>;
    getLastSuccessSummary(userId: string): Promise<ChurnCandidate | null>;
}

export interface SubscriptionHistory {
    findLastSuccessEndDates(userIds: readonly string[]): Promise<ReadonlyMap<string, Temporal.PlainDate>>;
    findUserIdsWithLastSuccessEndBefore(date: Temporal.PlainDate): Promise<readonly string[]>;
}

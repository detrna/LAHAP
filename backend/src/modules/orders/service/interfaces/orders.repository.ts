export * from "../../domain/errors.js";

export interface OrdersRepository {
    findLastSuccessEndDates(userIds: readonly string[]): Promise<ReadonlyMap<string, Temporal.PlainDate>>;
    findUserIdsWithLastSuccessEndBefore(date: Temporal.PlainDate): Promise<readonly string[]>;
}

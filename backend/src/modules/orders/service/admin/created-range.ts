import { BUSINESS_TIME_ZONE } from "../../../../shared/time/time-zone.js";
import { toDbTimestamp } from "../../../../shared/time/timestamp.js";
import type { CreatedRange } from "../interfaces/orders.repository.js";

const startOfDay = (date: Temporal.PlainDate) => toDbTimestamp(date.toZonedDateTime({ timeZone: BUSINESS_TIME_ZONE }));

export interface DateFilter {
    readonly from?: Temporal.PlainDate | undefined;
    readonly to?: Temporal.PlainDate | undefined;
}

export function toCreatedRange({ from, to }: DateFilter): CreatedRange {
    return {
        ...(from !== undefined ? { createdFrom: startOfDay(from) } : {}),
        ...(to !== undefined ? { createdBefore: startOfDay(to.add({ days: 1 })) } : {}),
    };
}

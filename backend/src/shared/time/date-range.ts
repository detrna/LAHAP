import { ValidationError } from "../errors/validation-error.js";
import { daysBetween } from "./calendar.js";

export interface DateRangeInput {
    readonly from?: Temporal.PlainDate | undefined;
    readonly to?: Temporal.PlainDate | undefined;
}

export interface DateRangeOptions {
    readonly defaultFrom: Temporal.PlainDate;
    readonly defaultSpanDays: number;
    readonly maxDays: number;
}

export interface DateRange {
    readonly from: Temporal.PlainDate;
    readonly to: Temporal.PlainDate;
}

export class InvalidDateRangeError extends ValidationError {
    constructor(message: string) {
        super([{ target: "query", path: "to", message, code: "custom" }]);
    }
}

export function resolveDateRange(input: DateRangeInput, options: DateRangeOptions): DateRange {
    const from = input.from ?? options.defaultFrom;
    const to = input.to ?? from.add({ days: options.defaultSpanDays - 1 });

    const days = daysBetween(from, to);
    if (days < 0) {
        throw new InvalidDateRangeError("must not be before from");
    }
    if (days + 1 > options.maxDays) {
        throw new InvalidDateRangeError(`must span at most ${options.maxDays} days`);
    }
    return { from, to };
}

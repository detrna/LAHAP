import { ValidationError } from "../../../../shared/errors/validation-error.js";
import type { ValidationIssue } from "../../../../shared/response/error-response.js";
import { isSameClockTime } from "../../../../shared/utils/meal-time/meal-time.js";
import type { MealTimeChange } from "../interfaces/catalog.repository.js";

export function renameMealTimes(
    current: readonly Temporal.PlainTime[],
    changes: readonly MealTimeChange[],
): Temporal.PlainTime[] {
    const issues: ValidationIssue[] = changes.flatMap((change, index) => [
        ...(current.some(time => isSameClockTime(time, change.from))
            ? []
            : [
                  {
                      target: "body",
                      path: `deliveryTimeChanges.${index}.from`,
                      message: "must be one of the package's meal times",
                      code: "unknown_delivery_time",
                  },
              ]),
        ...(current.some(time => isSameClockTime(time, change.to))
            ? [
                  {
                      target: "body",
                      path: `deliveryTimeChanges.${index}.to`,
                      message: "is already one of the package's meal times",
                      code: "delivery_time_exists",
                  },
              ]
            : []),
    ]);
    if (issues.length > 0) throw new ValidationError(issues);

    return current.map(time => changes.find(change => isSameClockTime(change.from, time))?.to ?? time);
}

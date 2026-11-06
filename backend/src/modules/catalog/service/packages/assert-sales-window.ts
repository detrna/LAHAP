import { ValidationError } from "../../../../shared/errors/validation-error.js";
import { isValidSalesWindow } from "../../domain/package-availability.js";

export function assertSalesWindow(startAt: Temporal.PlainDateTime, endAt: Temporal.PlainDateTime | null): void {
    if (isValidSalesWindow(startAt, endAt)) return;
    throw new ValidationError([
        { target: "body", path: "endAt", message: "must be after startAt", code: "end_before_start" },
    ]);
}

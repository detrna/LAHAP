import { ValidationError } from "../../../shared/errors/validation-error.js";

export const CHANGE_REASON_REQUIRED = "change_reason_required";

export function assertChangeReason(changeReason: string | undefined, path: string): void {
    if (changeReason !== undefined) return;
    throw new ValidationError([
        {
            target: "body",
            path,
            message: "is required when the schedule has paid orders",
            code: CHANGE_REASON_REQUIRED,
        },
    ]);
}

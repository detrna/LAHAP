import { AppError } from "../../errors/app-error.js";

export class InvalidPhoneNumberError extends AppError {
    readonly code = "INVALID_PHONE_NUMBER";
    readonly statusCode = 400;

    constructor(reason = "phone number must be an Indonesian number like 0812…, +62812… or 62812…") {
        super(reason);
    }
}

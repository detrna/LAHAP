import { describe, expect, it } from "vitest";
import { AppError } from "./app-error.js";
import { UserNotFoundError } from "./user-not-found-error.js";

describe("UserNotFoundError", () => {
    it("is a 404 USER_NOT_FOUND naming the user", () => {
        const error = new UserNotFoundError("user-1");

        expect(error).toBeInstanceOf(AppError);
        expect(error).toMatchObject({
            code: "USER_NOT_FOUND",
            statusCode: 404,
            userId: "user-1",
            message: 'user not found: "user-1"',
        });
    });
});

import { describe, expect, it } from "vitest";
import { createMockNext, createMockRequest, createMockResponse } from "../../../tests/utils/mocks/express.js";
import { authorize, requireRoles } from "./authorize.js";
import { ForbiddenError, MissingTokenError } from "./errors.js";

describe("authorize middleware (unit)", () => {
    it("fails with MissingTokenError when req.user is not populated", () => {
        const middleware = authorize("ADMIN");
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        const error = next.mock.calls[0]?.[0];
        expect(error).toBeInstanceOf(MissingTokenError);
        expect((error as MissingTokenError).statusCode).toBe(401);
    });

    it("fails with ForbiddenError (403) when user role is not authorized", () => {
        const middleware = authorize("ADMIN", "MANAGER");
        const req = createMockRequest({
            user: { userId: "user-1", name: "Alice", role: "USER" },
        });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        const error = next.mock.calls[0]?.[0];
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).statusCode).toBe(403);
        expect((error as ForbiddenError).message).toContain('role "USER" is not authorized');
    });

    it("allows request when user has one of the allowed roles (rest parameters)", () => {
        const middleware = authorize("ADMIN", "MANAGER");
        const req = createMockRequest({
            user: { userId: "user-1", name: "Alice", role: "ADMIN" },
        });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
    });

    it("allows request when user has one of the allowed roles (array parameter)", () => {
        const middleware = authorize(["ADMIN", "MANAGER"]);
        const req = createMockRequest({
            user: { userId: "user-2", name: "Bob", role: "MANAGER" },
        });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
    });

    it("allows any authenticated user when no specific roles are specified", () => {
        const middleware = authorize();
        const req = createMockRequest({
            user: { userId: "user-3", name: "Charlie", role: "GUEST" },
        });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
    });

    it("provides requireRoles as an alias with identical behavior", () => {
        const middleware = requireRoles("ADMIN");
        const req = createMockRequest({
            user: { userId: "user-1", name: "Alice", role: "ADMIN" },
        });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
    });
});

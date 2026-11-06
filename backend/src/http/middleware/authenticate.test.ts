import { describe, expect, it } from "vitest";
import {
    createExpiredAccessToken,
    createTokenPayload,
    createTokenProvider,
} from "../../../tests/utils/factory/jwt/jwt.js";
import { createMockNext, createMockRequest, createMockResponse } from "../../../tests/utils/mocks/express.js";
import { AppError } from "../../shared/errors/app-error.js";
import { InvalidTokenError, TokenExpiredError } from "../../shared/ports/token-provider/token-provider.js";
import { authenticate, extractBearerToken } from "./authenticate.js";
import { InvalidAuthorizationHeaderError, MissingTokenError } from "./errors.js";

const sampleUser = createTokenPayload({
    sub: {
        userId: "user-42",
        name: "Siti Rahma",
    },
    role: "ADMIN",
});

describe("Authentication Middleware", () => {
    const tokenProvider = createTokenProvider();

    describe("extractBearerToken", () => {
        it("extracts token from standard Authorization header", () => {
            const req = createMockRequest({
                headers: { authorization: "Bearer my-token-123" },
            });
            expect(extractBearerToken(req)).toBe("my-token-123");
        });

        it("handles case-insensitive 'bearer' prefix", () => {
            const req = createMockRequest({
                headers: { authorization: "bearer my-token-123" },
            });
            expect(extractBearerToken(req)).toBe("my-token-123");
        });

        it("falls back to x-access-token header", () => {
            const req = createMockRequest({
                headers: { "x-access-token": "fallback-token-456" },
            });
            expect(extractBearerToken(req)).toBe("fallback-token-456");
        });

        it("returns null when no token headers are provided", () => {
            const req = createMockRequest();
            expect(extractBearerToken(req)).toBeNull();
        });

        it("ignores ?accessToken= unless allowQueryToken is on", () => {
            const req = createMockRequest({ query: { accessToken: "query-token" } });

            expect(extractBearerToken(req)).toBeNull();
            expect(extractBearerToken(req, { allowQueryToken: false })).toBeNull();
        });

        it("reads ?accessToken= when allowQueryToken is on", () => {
            const req = createMockRequest({ query: { accessToken: " query-token " } });

            expect(extractBearerToken(req, { allowQueryToken: true })).toBe("query-token");
        });

        it("prefers both headers over ?accessToken=", () => {
            const bearer = createMockRequest({
                headers: { authorization: "Bearer header-token" },
                query: { accessToken: "query-token" },
            });
            const custom = createMockRequest({
                headers: { "x-access-token": "custom-token" },
                query: { accessToken: "query-token" },
            });

            expect(extractBearerToken(bearer, { allowQueryToken: true })).toBe("header-token");
            expect(extractBearerToken(custom, { allowQueryToken: true })).toBe("custom-token");
        });

        it("ignores an empty or repeated ?accessToken=", () => {
            const empty = createMockRequest({ query: { accessToken: "  " } });
            const repeated = createMockRequest({ query: { accessToken: ["a", "b"] } });

            expect(extractBearerToken(empty, { allowQueryToken: true })).toBeNull();
            expect(extractBearerToken(repeated, { allowQueryToken: true })).toBeNull();
        });

        it("throws InvalidAuthorizationHeaderError when header is malformed", () => {
            const req1 = createMockRequest({ headers: { authorization: "Basic dXNlcjpwYXNz" } });
            expect(() => extractBearerToken(req1)).toThrow(InvalidAuthorizationHeaderError);

            const req2 = createMockRequest({ headers: { authorization: "Bearer " } });
            expect(() => extractBearerToken(req2)).toThrow(InvalidAuthorizationHeaderError);

            const req3 = createMockRequest({ headers: { authorization: "   " } });
            expect(() => extractBearerToken(req3)).toThrow(InvalidAuthorizationHeaderError);
        });
    });

    describe("authenticate middleware", () => {
        it("authenticates valid access token and attaches req.user and req.tokenPayload", () => {
            const accessToken = tokenProvider.signAccessToken(sampleUser);
            const middleware = authenticate({ tokenProvider });

            const req = createMockRequest({
                headers: { authorization: `Bearer ${accessToken}` },
            });
            const res = createMockResponse();
            const next = createMockNext();

            middleware(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expect(req.user).toEqual({
                userId: "user-42",
                name: "Siti Rahma",
                role: "ADMIN",
            });
            expect(req.tokenPayload).toMatchObject({
                role: "ADMIN",
                sub: { userId: "user-42", name: "Siti Rahma" },
            });
        });

        it("authenticates a query token only on a route that allows it", () => {
            const accessToken = tokenProvider.signAccessToken(sampleUser);
            const query = { accessToken };

            const allowed = createMockNext();
            authenticate({ tokenProvider, allowQueryToken: true })(
                createMockRequest({ query }),
                createMockResponse(),
                allowed,
            );
            const refused = createMockNext();
            authenticate({ tokenProvider })(createMockRequest({ query }), createMockResponse(), refused);

            expect(allowed).toHaveBeenCalledWith();
            expect(refused.mock.calls[0]?.[0]).toBeInstanceOf(MissingTokenError);
        });

        it("fails with MissingTokenError (401) when no token is present", () => {
            const middleware = authenticate({ tokenProvider });
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            middleware(req, res, next);

            const error = next.mock.calls[0]?.[0];
            expect(error).toBeInstanceOf(MissingTokenError);
            expect(error).toBeInstanceOf(AppError);
            expect((error as MissingTokenError).statusCode).toBe(401);
        });

        it("fails with InvalidAuthorizationHeaderError (401) when header is malformed", () => {
            const middleware = authenticate({ tokenProvider });
            const req = createMockRequest({
                headers: { authorization: "Token not-bearer" },
            });
            const res = createMockResponse();
            const next = createMockNext();

            middleware(req, res, next);

            const error = next.mock.calls[0]?.[0];
            expect(error).toBeInstanceOf(InvalidAuthorizationHeaderError);
            expect((error as InvalidAuthorizationHeaderError).statusCode).toBe(401);
        });

        it("fails with InvalidTokenError (401) when access token has invalid signature", () => {
            const middleware = authenticate({ tokenProvider });
            const req = createMockRequest({
                headers: { authorization: "Bearer invalid.jwt.signature" },
            });
            const res = createMockResponse();
            const next = createMockNext();

            middleware(req, res, next);

            const error = next.mock.calls[0]?.[0];
            expect(error).toBeInstanceOf(InvalidTokenError);
            expect((error as InvalidTokenError).statusCode).toBe(401);
        });

        it("fails with TokenExpiredError (401) when access token has expired", () => {
            const expiredToken = createExpiredAccessToken({ sub: sampleUser.sub, role: sampleUser.role });

            const middleware = authenticate({ tokenProvider });
            const req = createMockRequest({
                headers: { authorization: `Bearer ${expiredToken}` },
            });
            const res = createMockResponse();
            const next = createMockNext();

            middleware(req, res, next);

            const error = next.mock.calls[0]?.[0];
            expect(error).toBeInstanceOf(TokenExpiredError);
            expect((error as TokenExpiredError).statusCode).toBe(401);
        });
    });
});

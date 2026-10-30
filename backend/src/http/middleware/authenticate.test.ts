import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";
import { JwtTokenProvider } from "../../infrastructure/token-provider/jwt/jwt.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
    InvalidTokenError,
    TokenExpiredError,
    type SignTokenPayload,
} from "../../shared/ports/token-provider/token-provider.js";
import { authenticate, extractBearerToken } from "./authenticate.js";
import { InvalidAuthorizationHeaderError, MissingTokenError } from "./errors.js";

const testJwtConfig = {
    SECRET: "test-access-secret-32-bytes-long!",
    EXPIRES_IN: "1h",
    REFRESH_SECRET: "test-refresh-secret-32-bytes-long!",
    REFRESH_EXPIRES_IN: "7d",
    ALGORITHM: "HS256",
    ISSUER: "gtnic-auth",
    AUDIENCE: "gtnic-app",
};

const sampleUser: SignTokenPayload = {
    sub: {
        userId: "user-42",
        name: "Siti Rahma",
    },
    role: "ADMIN",
};

function createMockRequest(
    options: {
        headers?: Record<string, string | undefined>;
    } = {},
): Request {
    return {
        headers: options.headers ?? {},
    } as unknown as Request;
}

function createMockResponse(): Response {
    return {} as unknown as Response;
}

function createMockNext() {
    const fn = vi.fn<(err?: unknown) => void>();
    return Object.assign(fn, {} as NextFunction);
}

describe("Authentication Middleware", () => {
    const tokenProvider = new JwtTokenProvider(testJwtConfig);

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
            const expiredToken = jwt.sign({ sub: sampleUser.sub, role: sampleUser.role }, testJwtConfig.SECRET, {
                algorithm: "HS256",
                expiresIn: -10, // expired 10 seconds ago
                issuer: testJwtConfig.ISSUER,
                audience: testJwtConfig.AUDIENCE,
                jwtid: "expired-jti-1",
            });

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

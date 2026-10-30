import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { JwtTokenProvider } from "../../infrastructure/token-provider/jwt/jwt.js";
import type { SignTokenPayload } from "../../shared/ports/token-provider/token-provider.js";
import { authenticate } from "./authenticate.js";
import { errorHandler } from "./error-handler.js";

const testJwtConfig = {
    SECRET: "test-access-secret-32-bytes-long!",
    EXPIRES_IN: "1h",
    REFRESH_SECRET: "test-refresh-secret-32-bytes-long!",
    REFRESH_EXPIRES_IN: "7d",
    ALGORITHM: "HS256",
    ISSUER: "gtnic-auth",
    AUDIENCE: "gtnic-app",
};

const sampleAdmin: SignTokenPayload = {
    sub: {
        userId: "user-42",
        name: "Siti Rahma",
    },
    role: "ADMIN",
};

function createTestApp(tokenProvider: JwtTokenProvider) {
    const app = express();
    app.use(express.json());

    app.get("/me", authenticate({ tokenProvider }), (req, res) => {
        res.status(200).json({
            user: req.user,
            iss: req.tokenPayload?.iss,
            jti: req.tokenPayload?.jti,
        });
    });

    app.delete(
        "/admin/users/:id",
        authenticate({ tokenProvider, requiredRoles: ["ADMIN", "SUPER_ADMIN"] }),
        (req, res) => {
            res.status(200).json({
                deletedUserId: req.params.id,
                performedBy: req.user?.userId,
            });
        },
    );

    app.use(errorHandler());
    return app;
}

describe("authenticate middleware (integration)", () => {
    const tokenProvider = new JwtTokenProvider(testJwtConfig);
    const app = createTestApp(tokenProvider);

    it("authenticates request with valid Authorization Bearer token and populates req.user and req.tokenPayload", async () => {
        const accessToken = tokenProvider.signAccessToken(sampleAdmin);

        const res = await request(app)
            .get("/me")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            user: {
                userId: "user-42",
                name: "Siti Rahma",
                role: "ADMIN",
            },
            iss: "gtnic-auth",
            jti: expect.any(String),
        });
    });

    it("supports case-insensitive 'bearer' prefix and x-access-token fallback header", async () => {
        const accessToken = tokenProvider.signAccessToken(sampleAdmin);

        const lowerBearerRes = await request(app)
            .get("/me")
            .set("Authorization", `bearer ${accessToken}`);
        expect(lowerBearerRes.status).toBe(200);
        expect(lowerBearerRes.body.user.userId).toBe("user-42");

        const fallbackHeaderRes = await request(app)
            .get("/me")
            .set("x-access-token", accessToken);
        expect(fallbackHeaderRes.status).toBe(200);
        expect(fallbackHeaderRes.body.user.userId).toBe("user-42");
    });

    it("returns 401 MISSING_TOKEN when no authentication header is provided", async () => {
        const res = await request(app).get("/me");

        expect(res.status).toBe(401);
        expect(res.body).toEqual({
            error: {
                code: "MISSING_TOKEN",
                message: "authentication token is required",
            },
        });
    });

    it("returns 401 INVALID_AUTHORIZATION_HEADER when Authorization header is malformed", async () => {
        const basicRes = await request(app)
            .get("/me")
            .set("Authorization", "Basic dXNlcjpwYXNz");

        expect(basicRes.status).toBe(401);
        expect(basicRes.body).toEqual({
            error: {
                code: "INVALID_AUTHORIZATION_HEADER",
                message: "authorization header must be in format 'Bearer <token>'",
            },
        });

        const emptyRes = await request(app)
            .get("/me")
            .set("Authorization", "   ");

        expect(emptyRes.status).toBe(401);
        expect(emptyRes.body.error.code).toBe("INVALID_AUTHORIZATION_HEADER");
    });

    it("returns 401 INVALID_TOKEN when token signature is invalid or a refresh token is used", async () => {
        const badSigRes = await request(app)
            .get("/me")
            .set("Authorization", "Bearer invalid.jwt.signature");

        expect(badSigRes.status).toBe(401);
        expect(badSigRes.body.error.code).toBe("INVALID_TOKEN");

        const refreshToken = tokenProvider.signRefreshToken(sampleAdmin);
        const refreshAsAccessRes = await request(app)
            .get("/me")
            .set("Authorization", `Bearer ${refreshToken}`);

        expect(refreshAsAccessRes.status).toBe(401);
        expect(refreshAsAccessRes.body.error.code).toBe("INVALID_TOKEN");
    });

    it("returns 401 TOKEN_EXPIRED when access token has expired", async () => {
        const expiredToken = jwt.sign(
            { sub: sampleAdmin.sub, role: sampleAdmin.role },
            testJwtConfig.SECRET,
            {
                algorithm: "HS256",
                expiresIn: -10,
                issuer: testJwtConfig.ISSUER,
                audience: testJwtConfig.AUDIENCE,
                jwtid: "expired-jti-1",
            },
        );

        const res = await request(app)
            .get("/me")
            .set("Authorization", `Bearer ${expiredToken}`);

        expect(res.status).toBe(401);
        expect(res.body).toEqual({
            error: {
                code: "TOKEN_EXPIRED",
                message: expect.any(String),
            },
        });
    });

    it("enforces requiredRoles and returns 403 FORBIDDEN for unauthorized roles", async () => {
        const regularUserToken = tokenProvider.signAccessToken({
            sub: { userId: "user-99", name: "Regular User" },
            role: "USER",
        });

        const forbiddenRes = await request(app)
            .delete("/admin/users/user-50")
            .set("Authorization", `Bearer ${regularUserToken}`);

        expect(forbiddenRes.status).toBe(403);
        expect(forbiddenRes.body).toEqual({
            error: {
                code: "FORBIDDEN",
                message: 'role "USER" is not authorized to access this resource',
            },
        });

        const adminToken = tokenProvider.signAccessToken(sampleAdmin);
        const allowedRes = await request(app)
            .delete("/admin/users/user-50")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(allowedRes.status).toBe(200);
        expect(allowedRes.body).toEqual({
            deletedUserId: "user-50",
            performedBy: "user-42",
        });
    });
});

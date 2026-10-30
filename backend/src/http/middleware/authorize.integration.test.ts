import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { JwtTokenProvider } from "../../infrastructure/token-provider/jwt/jwt.js";
import { authenticate } from "./authenticate.js";
import { authorize, requireRoles } from "./authorize.js";
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

function createTestApp(tokenProvider: JwtTokenProvider) {
    const app = express();
    app.use(express.json());

    // Varargs role check
    app.get(
        "/admin/reports",
        authenticate({ tokenProvider }),
        authorize("ADMIN", "FINANCE"),
        (req, res) => {
            res.status(200).json({
                report: "secret-financial-data",
                user: req.user,
            });
        },
    );

    // Array syntax role check using requireRoles alias
    app.delete(
        "/admin/users/:id",
        authenticate({ tokenProvider }),
        requireRoles(["ADMIN", "SUPER_ADMIN"]),
        (req, res) => {
            res.status(200).json({
                deletedUserId: req.params.id,
                performedBy: req.user?.userId,
            });
        },
    );

    // Endpoint with authorize without authenticate first (misconfiguration guard)
    app.get("/unprotected-guard", authorize("ADMIN"), (_req, res) => {
        res.status(200).json({ status: "ok" });
    });

    app.use(errorHandler());
    return app;
}

describe("authorize middleware (integration)", () => {
    const tokenProvider = new JwtTokenProvider(testJwtConfig);
    const app = createTestApp(tokenProvider);

    it("allows access when authenticated user has an authorized role", async () => {
        const adminToken = tokenProvider.signAccessToken({
            sub: { userId: "admin-1", name: "Admin User" },
            role: "ADMIN",
        });

        const res = await request(app)
            .get("/admin/reports")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            report: "secret-financial-data",
            user: {
                userId: "admin-1",
                name: "Admin User",
                role: "ADMIN",
            },
        });
    });

    it("returns 403 FORBIDDEN when authenticated user does not have an authorized role", async () => {
        const regularUserToken = tokenProvider.signAccessToken({
            sub: { userId: "user-9", name: "Regular User" },
            role: "USER",
        });

        const res = await request(app)
            .get("/admin/reports")
            .set("Authorization", `Bearer ${regularUserToken}`);

        expect(res.status).toBe(403);
        expect(res.body).toEqual({
            error: {
                code: "FORBIDDEN",
                message: 'role "USER" is not authorized to access this resource',
            },
        });
    });

    it("works with array arguments and requireRoles alias", async () => {
        const superAdminToken = tokenProvider.signAccessToken({
            sub: { userId: "super-1", name: "Super User" },
            role: "SUPER_ADMIN",
        });

        const allowedRes = await request(app)
            .delete("/admin/users/user-50")
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(allowedRes.status).toBe(200);
        expect(allowedRes.body).toEqual({
            deletedUserId: "user-50",
            performedBy: "super-1",
        });

        const financeToken = tokenProvider.signAccessToken({
            sub: { userId: "fin-1", name: "Finance User" },
            role: "FINANCE",
        });

        const rejectedRes = await request(app)
            .delete("/admin/users/user-50")
            .set("Authorization", `Bearer ${financeToken}`);

        expect(rejectedRes.status).toBe(403);
        expect(rejectedRes.body.error.code).toBe("FORBIDDEN");
    });

    it("returns 401 MISSING_TOKEN if authorize runs without req.user populated", async () => {
        const res = await request(app).get("/unprotected-guard");

        expect(res.status).toBe(401);
        expect(res.body).toEqual({
            error: {
                code: "MISSING_TOKEN",
                message: "authentication required before authorization check",
            },
        });
    });
});

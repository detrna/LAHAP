import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createTokenProvider } from "../../../tests/utils/factory/jwt/jwt.js";
import type { Logger } from "../../shared/ports/logger/logger.js";
import { ObjectNotFoundError } from "../../shared/ports/object-storage/errors.js";
import { PaymentGatewayProviderError } from "../../shared/ports/payment-gateway/errors.js";
import { authenticate } from "./authenticate.js";
import { authorize } from "./authorize.js";
import { errorHandler } from "./error-handler.js";
import { validateBody, validateParams } from "./validate-request.js";

function createMockLogger(): Logger & {
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
} {
    const logger = {
        fatal: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
        child: vi.fn(),
        isLevelEnabled: vi.fn(() => true),
    };
    logger.child.mockReturnValue(logger);
    return logger;
}

describe("errorHandler middleware (integration)", () => {
    const tokenProvider = createTokenProvider();

    function createTestApp(logger: Logger) {
        const app = express();
        app.use(express.json());

        app.post(
            "/orders",
            authenticate({ tokenProvider }),
            authorize("ADMIN", "USER"),
            validateBody(
                z.object({
                    itemId: z.string().uuid("Invalid item UUID"),
                    quantity: z.number().int().positive("Quantity must be > 0"),
                }),
            ),
            (req, res) => {
                res.status(201).json({
                    userId: req.user?.userId,
                    order: req.body,
                });
            },
        );

        app.get("/receipts/:key", validateParams(z.object({ key: z.string().min(3) })), async (req, _res) => {
            if (req.params.key === "missing") {
                throw new ObjectNotFoundError("receipts/missing.jpg");
            }
            if (req.params.key === "gateway-down") {
                throw new PaymentGatewayProviderError("Upstream payment service unavailable", {
                    statusCode: 502,
                });
            }
            throw new Error("db pool exhausted: secret-connection-string");
        });

        app.use(errorHandler({ logger }));
        return app;
    }

    it("passes valid authenticated and validated requests through to the route handler", async () => {
        const logger = createMockLogger();
        const app = createTestApp(logger);
        const token = tokenProvider.signAccessToken({
            sub: { userId: "user-1", name: "Budi" },
            role: "USER",
        });

        const res = await request(app).post("/orders").set("Authorization", `Bearer ${token}`).send({
            itemId: "550e8400-e29b-41d4-a716-446655440000",
            quantity: 3,
        });

        expect(res.status).toBe(201);
        expect(res.body).toEqual({
            userId: "user-1",
            order: {
                itemId: "550e8400-e29b-41d4-a716-446655440000",
                quantity: 3,
            },
        });
        expect(logger.warn).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
    });

    it("returns 400 INVALID_JSON when request body contains malformed JSON", async () => {
        const logger = createMockLogger();
        const app = createTestApp(logger);

        const res = await request(app)
            .post("/orders")
            .set("Content-Type", "application/json")
            .send("{ invalidJson: true ");

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: {
                code: "INVALID_JSON",
                message: "malformed JSON in request body",
            },
        });
        expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it("returns 401 MISSING_TOKEN when authenticate middleware rejects unauthenticated request", async () => {
        const logger = createMockLogger();
        const app = createTestApp(logger);

        const res = await request(app).post("/orders").send({
            itemId: "550e8400-e29b-41d4-a716-446655440000",
            quantity: 1,
        });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({
            error: {
                code: "MISSING_TOKEN",
                message: "authentication token is required",
            },
        });
        expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it("returns 403 FORBIDDEN when authenticate middleware rejects unauthorized role", async () => {
        const logger = createMockLogger();
        const app = createTestApp(logger);
        const guestToken = tokenProvider.signAccessToken({
            sub: { userId: "user-2", name: "Guest" },
            role: "GUEST",
        });

        const res = await request(app).post("/orders").set("Authorization", `Bearer ${guestToken}`).send({
            itemId: "550e8400-e29b-41d4-a716-446655440000",
            quantity: 1,
        });

        expect(res.status).toBe(403);
        expect(res.body).toEqual({
            error: {
                code: "FORBIDDEN",
                message: 'role "GUEST" is not authorized to access this resource',
            },
        });
        expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it("returns 400 VALIDATION_ERROR with structured issues when validateBody fails", async () => {
        const logger = createMockLogger();
        const app = createTestApp(logger);
        const token = tokenProvider.signAccessToken({
            sub: { userId: "user-1", name: "Budi" },
            role: "USER",
        });

        const res = await request(app).post("/orders").set("Authorization", `Bearer ${token}`).send({
            itemId: "not-a-uuid",
            quantity: -5,
        });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: {
                code: "VALIDATION_ERROR",
                message: expect.stringContaining("body.itemId: Invalid item UUID"),
                issues: [
                    expect.objectContaining({
                        target: "body",
                        path: "itemId",
                        message: "Invalid item UUID",
                    }),
                    expect.objectContaining({
                        target: "body",
                        path: "quantity",
                        message: "Quantity must be > 0",
                    }),
                ],
            },
        });
        expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it("catches async 404 and 502 AppErrors thrown inside route handlers", async () => {
        const logger = createMockLogger();
        const app = createTestApp(logger);

        const notFoundRes = await request(app).get("/receipts/missing");
        expect(notFoundRes.status).toBe(404);
        expect(notFoundRes.body).toEqual({
            error: {
                code: "OBJECT_NOT_FOUND",
                message: "object not found: receipts/missing.jpg",
            },
        });
        expect(logger.warn).toHaveBeenCalledTimes(1);

        const badGatewayRes = await request(app).get("/receipts/gateway-down");
        expect(badGatewayRes.status).toBe(502);
        expect(badGatewayRes.body).toEqual({
            error: {
                code: "PAYMENT_GATEWAY_PROVIDER_ERROR",
                message: "Upstream payment service unavailable",
            },
        });
        expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it("catches unexpected async route errors and masks internal details with 500 INTERNAL_SERVER_ERROR", async () => {
        const logger = createMockLogger();
        const app = createTestApp(logger);

        const res = await request(app).get("/receipts/unexpected");

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "internal server error",
            },
        });
        expect(JSON.stringify(res.body)).not.toContain("secret-connection-string");
        expect(logger.error).toHaveBeenCalledTimes(1);
    });
});

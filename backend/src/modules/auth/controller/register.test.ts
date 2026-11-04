import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupAuthController } from "../test-utils/setup/auth.setup.js";

describe("AuthController.register (unit)", () => {
    it("answers 201 with the session", async () => {
        const { session, authService, controller } = setupAuthController();
        const body = { phone: "6281200000001", password: "password123" };
        const res = createMockResponse();

        await controller.register(createMockRequest({ body }), res);

        expect(authService.register).toHaveBeenCalledWith(body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: session });
    });

    it("sets the refresh token as an HttpOnly cookie scoped to /api/auth", async () => {
        const { session, cookieAttributes, controller } = setupAuthController();
        const res = createMockResponse();

        await controller.register(createMockRequest({ body: {} }), res);

        expect(res.cookie).toHaveBeenCalledWith("lahap_refresh", session.refreshToken, {
            ...cookieAttributes,
            maxAge: session.refreshExpiresIn * 1000,
        });
    });
});

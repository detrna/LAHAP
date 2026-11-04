import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { MissingTokenError } from "../../../http/middleware/errors.js";
import { setupAuthController } from "../test-utils/setup/auth.setup.js";

describe("AuthController.refresh (unit)", () => {
    it("answers 200 with the session and sets the new refresh cookie", async () => {
        const { session, authService, cookieAttributes, controller } = setupAuthController();
        const res = createMockResponse();

        await controller.refresh(createMockRequest({ body: { refreshToken: "body-token" } }), res);

        expect(authService.refresh).toHaveBeenCalledWith({ refreshToken: "body-token" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: session });
        expect(res.cookie).toHaveBeenCalledWith("lahap_refresh", session.refreshToken, {
            ...cookieAttributes,
            maxAge: session.refreshExpiresIn * 1000,
        });
    });

    it("reads the refresh token from the cookie when the body has none", async () => {
        const { authService, controller } = setupAuthController();

        await controller.refresh(
            createMockRequest({ body: {}, cookies: { lahap_refresh: "cookie-token" } }),
            createMockResponse(),
        );

        expect(authService.refresh).toHaveBeenCalledWith({ refreshToken: "cookie-token" });
    });

    it("prefers the body token when both are sent", async () => {
        const { authService, controller } = setupAuthController();

        await controller.refresh(
            createMockRequest({ body: { refreshToken: "body-token" }, cookies: { lahap_refresh: "cookie-token" } }),
            createMockResponse(),
        );

        expect(authService.refresh).toHaveBeenCalledWith({ refreshToken: "body-token" });
    });

    it("throws MissingTokenError without calling the service when neither is sent", async () => {
        const { authService, controller } = setupAuthController();
        const res = createMockResponse();

        await expect(controller.refresh(createMockRequest({ body: {} }), res)).rejects.toBeInstanceOf(
            MissingTokenError,
        );
        expect(authService.refresh).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});

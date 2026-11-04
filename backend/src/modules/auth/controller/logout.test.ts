import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupAuthController } from "../test-utils/setup/auth.setup.js";

describe("AuthController.logout (unit)", () => {
    it("revokes the refresh token from the body and answers 204 with no body", async () => {
        const { authService, controller } = setupAuthController();
        const res = createMockResponse();

        await controller.logout(createMockRequest({ body: { refreshToken: "body-token" } }), res);

        expect(authService.logout).toHaveBeenCalledWith({ refreshToken: "body-token" });
        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.end).toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });

    it("reads the refresh token from the cookie when the body has none", async () => {
        const { authService, controller } = setupAuthController();

        await controller.logout(
            createMockRequest({ body: {}, cookies: { lahap_refresh: "cookie-token" } }),
            createMockResponse(),
        );

        expect(authService.logout).toHaveBeenCalledWith({ refreshToken: "cookie-token" });
    });

    it("answers 204 without calling the service when no token is sent", async () => {
        const { authService, controller } = setupAuthController();
        const res = createMockResponse();

        await controller.logout(createMockRequest(), res);

        expect(authService.logout).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it("clears the refresh cookie with the same attributes it was set with", async () => {
        const { cookieAttributes, controller } = setupAuthController();
        const res = createMockResponse();

        await controller.logout(createMockRequest(), res);

        expect(res.clearCookie).toHaveBeenCalledWith("lahap_refresh", cookieAttributes);
    });
});

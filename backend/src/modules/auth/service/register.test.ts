import { describe, expect, it } from "vitest";
import { setupAuthService } from "../test-utils/setup/auth.setup.js";

describe("AuthService.register (unit)", () => {
    it("registers the customer and returns a session for them", async () => {
        const { user, userAccounts, tokenProvider, service } = setupAuthService();
        userAccounts.registerCustomer.mockResolvedValue(user);

        const session = await service.register({
            phone: "6281200000001",
            password: "password123",
            name: "Rina",
        });

        expect(userAccounts.registerCustomer).toHaveBeenCalledWith({
            phone: "6281200000001",
            password: "password123",
            name: "Rina",
        });
        expect(session).toMatchObject({ tokenType: "Bearer", expiresIn: 3600, refreshExpiresIn: 7 * 24 * 3600, user });
        expect(tokenProvider.verifyAccessToken(session.accessToken)).toMatchObject({
            sub: { userId: user.id, name: "Rina Putri" },
            role: "CUSTOMER",
        });
        expect(tokenProvider.verifyRefreshToken(session.refreshToken).sub.userId).toBe(user.id);
    });
});

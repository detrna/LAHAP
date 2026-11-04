import { describe, expect, it } from "vitest";
import { InvalidCredentialsError } from "../domain/errors.js";
import { setupAuthService } from "../test-utils/setup/auth.setup.js";

describe("AuthService.login (unit)", () => {
    it("returns a session when the credentials are valid", async () => {
        const { user, userAccounts, service } = setupAuthService();
        userAccounts.verifyCredentials.mockResolvedValue(user);

        const session = await service.login({ identifier: "081200000001", password: "password123" });

        expect(userAccounts.verifyCredentials).toHaveBeenCalledWith("081200000001", "password123");
        expect(session.user).toBe(user);
    });

    it("throws InvalidCredentialsError when they are not", async () => {
        const { service } = setupAuthService();

        const attempt = service.login({ identifier: "081200000001", password: "wrong" });

        await expect(attempt).rejects.toBeInstanceOf(InvalidCredentialsError);
        await expect(attempt).rejects.toMatchObject({
            statusCode: 401,
            code: "INVALID_CREDENTIALS",
            message: "invalid credentials",
        });
    });
});

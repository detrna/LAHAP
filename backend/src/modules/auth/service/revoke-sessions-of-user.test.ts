import { describe, expect, it } from "vitest";
import { setupAuthService } from "../test-utils/setup/auth.setup.js";

describe("AuthService.revokeSessionsOfUser (unit)", () => {
    it("revokes every active refresh token of the user at the current time", async () => {
        const { user, authRepository, service } = setupAuthService();

        await service.revokeSessionsOfUser(user.id);

        expect(authRepository.revokeRefreshTokensOfUser).toHaveBeenCalledWith(
            user.id,
            Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        );
    });
});

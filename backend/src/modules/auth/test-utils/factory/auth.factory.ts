import { buildUser } from "../../../users/test-utils/factory/users.factory.js";
import type { AuthSession } from "../../domain/auth.domain.js";

export function buildAuthSession(overrides: Partial<AuthSession> = {}): AuthSession {
    return {
        accessToken: "test accessToken",
        refreshToken: "test refreshToken",
        tokenType: "Bearer",
        expiresIn: 1,
        user: buildUser(),
        ...overrides,
    };
}

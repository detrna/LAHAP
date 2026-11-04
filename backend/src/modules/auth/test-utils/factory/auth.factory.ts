import { buildUser } from "../../../users/test-utils/factory/users.factory.js";
import type { AuthSession } from "../../domain/auth.domain.js";
import type { RefreshTokenRecord } from "../../service/interfaces/auth.repository.js";

export function buildAuthSession(overrides: Partial<AuthSession> = {}): AuthSession {
    return {
        accessToken: "test accessToken",
        refreshToken: "test refreshToken",
        tokenType: "Bearer",
        expiresIn: 1,
        refreshExpiresIn: 604800,
        user: buildUser(),
        ...overrides,
    };
}

export function buildRefreshTokenRecord(overrides: Partial<RefreshTokenRecord> = {}): RefreshTokenRecord {
    return {
        id: "00000009-0000-4000-8000-000000000001",
        userId: "00000003-0000-4000-8000-000000000005",
        expiresAt: Temporal.PlainDateTime.from("2026-11-10T01:00:00"),
        revokedAt: null,
        createdAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        updatedAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        ...overrides,
    };
}

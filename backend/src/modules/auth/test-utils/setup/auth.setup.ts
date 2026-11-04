import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import { createTokenProvider } from "../../../../../tests/utils/factory/jwt/jwt.js";
import type { JwtTokenProvider } from "../../../../infrastructure/token-provider/jwt/jwt.js";
import type { User } from "../../../users/domain/user.domain.js";
import { buildUser } from "../../../users/test-utils/factory/users.factory.js";
import { AuthController } from "../../controller/auth.controller.js";
import type { RefreshCookieOptions } from "../../controller/refresh-cookie.js";
import type { AuthSession } from "../../domain/auth.domain.js";
import { AuthService } from "../../service/auth.service.js";
import type { AuthRepository } from "../../service/interfaces/auth.repository.js";
import type { UserAccounts } from "../../service/interfaces/user-accounts.js";
import { buildAuthSession } from "../factory/auth.factory.js";
import {
    createMockAuthRepository,
    createMockAuthService,
    createMockUserAccounts,
    type Mocked,
    type MockedAuthService,
} from "../mocks/auth.mocks.js";

export interface AuthServiceSetup {
    readonly user: User;
    readonly authRepository: Mocked<AuthRepository>;
    readonly userAccounts: Mocked<UserAccounts>;
    readonly tokenProvider: JwtTokenProvider;
    readonly clock: FixedClock;
    readonly service: AuthService;
}

export interface AuthControllerSetup {
    readonly session: AuthSession;
    readonly authService: MockedAuthService;
    readonly refreshCookie: RefreshCookieOptions;
    readonly cookieAttributes: {
        readonly httpOnly: true;
        readonly secure: true;
        readonly sameSite: "none";
        readonly path: "/api/auth";
    };
    readonly controller: AuthController;
}

export function setupAuthService(): AuthServiceSetup {
    const user = buildUser({ id: "00000003-0000-4000-8000-000000000005", name: "Rina Putri", role: "CUSTOMER" });
    const authRepository = createMockAuthRepository();
    const userAccounts = createMockUserAccounts();
    const tokenProvider = createTokenProvider();
    const clock = createFixedClock();
    return {
        user,
        authRepository,
        userAccounts,
        tokenProvider,
        clock,
        service: new AuthService(authRepository, userAccounts, tokenProvider, clock),
    };
}

export function setupAuthController(): AuthControllerSetup {
    const session = buildAuthSession();
    const authService = createMockAuthService(session);
    const refreshCookie: RefreshCookieOptions = { name: "lahap_refresh", sameSite: "none", secure: true };
    return {
        session,
        authService,
        refreshCookie,
        cookieAttributes: { httpOnly: true, secure: true, sameSite: "none", path: "/api/auth" },
        controller: new AuthController(authService as unknown as AuthService, refreshCookie),
    };
}

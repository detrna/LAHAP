import type { Clock } from "../../../shared/ports/clock/clock.js";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import { createSession } from "./create-session.js";
import type { AuthRepository } from "./interfaces/auth.repository.js";
import type { UserAccounts } from "./interfaces/user-accounts.js";
import { login } from "./login.js";
import { logout } from "./logout.js";
import { refresh } from "./refresh.js";
import { register } from "./register.js";

export class AuthService {
    constructor(
        readonly authRepository: AuthRepository,
        readonly userAccounts: UserAccounts,
        readonly tokenProvider: TokenProvider,
        readonly clock: Clock,
    ) {}

    register = register;
    login = login;
    refresh = refresh;
    logout = logout;
    createSession = createSession;
}

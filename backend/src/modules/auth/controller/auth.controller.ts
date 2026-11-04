import type { AuthService } from "../service/auth.service.js";
import { login } from "./login.js";
import { logout } from "./logout.js";
import type { RefreshCookieOptions } from "./refresh-cookie.js";
import { refresh } from "./refresh.js";
import { register } from "./register.js";

export class AuthController {
    constructor(
        readonly authService: AuthService,
        readonly refreshCookie: RefreshCookieOptions,
    ) {}

    register = register.bind(this);
    login = login.bind(this);
    refresh = refresh.bind(this);
    logout = logout.bind(this);
}

import type { AuthService } from "../service/auth.service.js";

export class AuthController {
    constructor(readonly authService: AuthService) {}
}

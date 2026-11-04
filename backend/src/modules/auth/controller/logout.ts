import type { Request, Response } from "express";
import type { AuthController } from "./auth.controller.js";
import { clearRefreshCookie, readRefreshToken } from "./refresh-cookie.js";

export async function logout(this: AuthController, req: Request, res: Response): Promise<void> {
    const refreshToken = readRefreshToken(req, this.refreshCookie);
    if (refreshToken !== undefined) {
        await this.authService.logout({ refreshToken });
    }
    clearRefreshCookie(res, this.refreshCookie);
    res.status(204).end();
}

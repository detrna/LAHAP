import type { Request, Response } from "express";
import { MissingTokenError } from "../../../http/middleware/errors.js";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { AuthController } from "./auth.controller.js";
import { readRefreshToken, setRefreshCookie } from "./refresh-cookie.js";

export async function refresh(this: AuthController, req: Request, res: Response): Promise<void> {
    const refreshToken = readRefreshToken(req, this.refreshCookie);
    if (refreshToken === undefined) {
        throw new MissingTokenError("refresh token is required");
    }

    const session = await this.authService.refresh({ refreshToken });
    setRefreshCookie(res, this.refreshCookie, session);
    res.status(200).json(createSuccessResponse(session));
}

import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { LoginBody } from "../schema/auth.schemas.js";
import type { AuthController } from "./auth.controller.js";
import { setRefreshCookie } from "./refresh-cookie.js";

export async function login(this: AuthController, req: Request, res: Response): Promise<void> {
    const session = await this.authService.login(req.body as LoginBody);
    setRefreshCookie(res, this.refreshCookie, session);
    res.status(200).json(createSuccessResponse(session));
}

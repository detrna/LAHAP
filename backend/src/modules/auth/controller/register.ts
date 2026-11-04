import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { RegisterBody } from "../schema/auth.schemas.js";
import type { AuthController } from "./auth.controller.js";
import { setRefreshCookie } from "./refresh-cookie.js";

export async function register(this: AuthController, req: Request, res: Response): Promise<void> {
    const session = await this.authService.register(req.body as RegisterBody);
    setRefreshCookie(res, this.refreshCookie, session);
    res.status(201).json(createSuccessResponse(session));
}

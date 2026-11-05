import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../../http/middleware/index.js";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { ProfileUpdateBody } from "../schema/users.schemas.js";
import type { UsersController } from "./users.controller.js";

export async function updateMe(this: UsersController, req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthenticatedRequest).user;
    res.json(createSuccessResponse(await this.usersService.updateProfile(userId, req.body as ProfileUpdateBody)));
}

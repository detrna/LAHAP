import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../../http/middleware/index.js";
import type { PasswordChangeBody } from "../schema/users.schemas.js";
import type { UsersController } from "./users.controller.js";

export async function changeMyPassword(this: UsersController, req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthenticatedRequest).user;
    await this.usersService.changePassword(userId, req.body as PasswordChangeBody);
    res.status(204).end();
}

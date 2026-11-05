import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { UserIdParams, UserUpdateBody } from "../schema/users.schemas.js";
import type { UsersController } from "./users.controller.js";

export async function updateUser(this: UsersController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as UserIdParams;
    res.json(createSuccessResponse(await this.usersService.updateUser(id, req.body as UserUpdateBody)));
}

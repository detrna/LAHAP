import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { UserIdParams } from "../schema/users.schemas.js";
import type { UsersController } from "./users.controller.js";

export async function getUser(this: UsersController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as UserIdParams;
    res.json(createSuccessResponse(await this.usersService.getUser(id)));
}

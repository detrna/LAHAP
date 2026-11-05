import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { UserCreateBody } from "../schema/users.schemas.js";
import type { UsersController } from "./users.controller.js";

export async function createUser(this: UsersController, req: Request, res: Response): Promise<void> {
    res.status(201).json(createSuccessResponse(await this.usersService.createUser(req.body as UserCreateBody)));
}

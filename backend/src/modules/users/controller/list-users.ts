import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../http/middleware/index.js";
import { createPaginatedResponse } from "../../../shared/response/index.js";
import type { UserListQuery } from "../schema/users.schemas.js";
import type { UsersController } from "./users.controller.js";

export async function listUsers(this: UsersController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { search, role, isActive, isChurned } = req.query as unknown as UserListQuery;
    const { items, total } = await this.usersService.listUsers({
        search,
        roles: role,
        isActive,
        isChurned,
        skip,
        take,
    });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

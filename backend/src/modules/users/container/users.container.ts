import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { UsersController } from "../controller/users.controller.js";
import { PrismaUsersRepository } from "../repository/prisma/users-repository.js";
import { createUsersRouter } from "../routes/users.routes.js";
import { UsersService } from "../service/users.service.js";

export class UsersContainer {
    readonly service: UsersService;
    readonly router: Router;

    constructor({ db, adapters }: ModuleDeps) {
        const repository = new PrismaUsersRepository(db);
        this.service = new UsersService(repository, adapters.hasher);
        const controller = new UsersController(this.service);
        this.router = createUsersRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

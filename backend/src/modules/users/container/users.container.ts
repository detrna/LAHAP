import type { Router } from "express";
import { PrismaUsersRepository } from "../repository/prisma/users-repository.js";
import type { ModuleDeps } from "../../module-deps.js";
import { UsersController } from "../controller/users.controller.js";
import { createUsersRouter } from "../routes/users.routes.js";
import { UsersService } from "../service/users.service.js";

/** Builds the users module. Only wiring here: no business logic, no other module's repositories. */
export class UsersContainer {
    readonly service: UsersService;
    readonly router: Router;

    constructor({ db, adapters }: ModuleDeps) {
        const repository = new PrismaUsersRepository(db);
        this.service = new UsersService(repository);
        const controller = new UsersController(this.service);
        this.router = createUsersRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

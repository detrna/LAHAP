import type { UsersService } from "../service/users.service.js";

export class UsersController {
    constructor(readonly usersService: UsersService) {}
}

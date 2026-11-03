import type { UsersService } from "../service/users.service.js";

/**
 * HTTP surface of the users module. Each handler lives in `./<action>.ts` as a function with a
 * `this: UsersController` receiver and is bound here (`getUserById = getUserById.bind(this)`), so it can be
 * passed straight to Express.
 */
export class UsersController {
    constructor(readonly usersService: UsersService) {}
}

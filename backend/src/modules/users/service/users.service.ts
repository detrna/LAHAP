import type { UsersRepository } from "./interfaces/users.repository.js";

/**
 * Use cases of the users module. Each method lives in `./<action>.ts` as a function with a
 * `this: UsersService` receiver and is attached here (`getById = getById;`).
 */
export class UsersService {
    constructor(readonly usersRepository: UsersRepository) {}
}

import type { UsersRepository } from "./interfaces/users.repository.js";

export class UsersService {
    constructor(readonly usersRepository: UsersRepository) {}
}

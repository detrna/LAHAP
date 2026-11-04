import type { Hasher } from "../../../shared/ports/hasher/hasher.js";
import { getActiveById } from "./get-active-by-id.js";
import type { UsersRepository } from "./interfaces/users.repository.js";
import { registerCustomer } from "./register-customer.js";
import { verifyCredentials } from "./verify-credentials.js";

export class UsersService {
    dummyPasswordHash: Promise<string> | undefined;

    constructor(
        readonly usersRepository: UsersRepository,
        readonly hasher: Hasher,
    ) {}

    registerCustomer = registerCustomer;
    verifyCredentials = verifyCredentials;
    getActiveById = getActiveById;
}

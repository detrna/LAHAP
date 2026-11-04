import type { Hasher } from "../../../../shared/ports/hasher/hasher.js";
import type { UsersRepository } from "../../service/interfaces/users.repository.js";
import { UsersService } from "../../service/users.service.js";
import { createMockHasher, createMockUsersRepository, type Mocked } from "../mocks/users.mocks.js";

export interface UsersServiceSetup {
    readonly repository: Mocked<UsersRepository>;
    readonly hasher: Mocked<Hasher>;
    readonly service: UsersService;
}

export function setupUsersService(): UsersServiceSetup {
    const repository = createMockUsersRepository();
    const hasher = createMockHasher();
    return { repository, hasher, service: new UsersService(repository, hasher) };
}

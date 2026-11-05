import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import type { Hasher } from "../../../../shared/ports/hasher/hasher.js";
import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import { UsersController } from "../../controller/users.controller.js";
import type { SessionRevoker } from "../../service/interfaces/session-revoker.js";
import type { UsersRepository } from "../../service/interfaces/users.repository.js";
import { UsersService } from "../../service/users.service.js";
import {
    createMockHasher,
    createMockObjectStorage,
    createMockSessionRevoker,
    createMockUsersRepository,
    createMockUsersService,
    type Mocked,
    type MockedUsersService,
} from "../mocks/users.mocks.js";

export interface UsersServiceSetup {
    readonly repository: Mocked<UsersRepository>;
    readonly hasher: Mocked<Hasher>;
    readonly objectStorage: Mocked<Pick<ObjectStorage, "getSignedUrl">>;
    readonly clock: FixedClock;
    readonly sessionRevoker: Mocked<SessionRevoker>;
    readonly service: UsersService;
}

export interface UsersControllerSetup {
    readonly usersService: MockedUsersService;
    readonly controller: UsersController;
}

export function setupUsersService(): UsersServiceSetup {
    const repository = createMockUsersRepository();
    const hasher = createMockHasher();
    const objectStorage = createMockObjectStorage();
    const clock = createFixedClock();
    const sessionRevoker = createMockSessionRevoker();
    return {
        repository,
        hasher,
        objectStorage,
        clock,
        sessionRevoker,
        service: new UsersService(repository, hasher, objectStorage as unknown as ObjectStorage, clock, sessionRevoker),
    };
}

export function setupUsersController(): UsersControllerSetup {
    const usersService = createMockUsersService();
    return { usersService, controller: new UsersController(usersService as unknown as UsersService) };
}

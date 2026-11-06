import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import type { Hasher } from "../../../../shared/ports/hasher/hasher.js";
import { UsersController } from "../../controller/users.controller.js";
import type { AllergyLookup } from "../../service/interfaces/allergy-lookup.js";
import type { MembershipLookup } from "../../service/interfaces/membership-lookup.js";
import type { SessionRevoker } from "../../service/interfaces/session-revoker.js";
import type { SubscriptionHistory } from "../../service/interfaces/subscription-history.js";
import type { UsersRepository } from "../../service/interfaces/users.repository.js";
import { UsersService } from "../../service/users.service.js";
import {
    createMockAllergyLookup,
    createMockHasher,
    createMockMembershipLookup,
    createMockSessionRevoker,
    createMockSubscriptionHistory,
    createMockUsersRepository,
    createMockUsersService,
    type Mocked,
    type MockedUsersService,
} from "../mocks/users.mocks.js";

export interface UsersServiceSetup {
    readonly repository: Mocked<UsersRepository>;
    readonly hasher: Mocked<Hasher>;
    readonly clock: FixedClock;
    readonly allergyLookup: Mocked<AllergyLookup>;
    readonly membershipLookup: Mocked<MembershipLookup>;
    readonly subscriptionHistory: Mocked<SubscriptionHistory>;
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
    const clock = createFixedClock();
    const allergyLookup = createMockAllergyLookup();
    const membershipLookup = createMockMembershipLookup();
    const subscriptionHistory = createMockSubscriptionHistory();
    const sessionRevoker = createMockSessionRevoker();
    return {
        repository,
        hasher,
        clock,
        allergyLookup,
        membershipLookup,
        subscriptionHistory,
        sessionRevoker,
        service: new UsersService(
            repository,
            hasher,
            clock,
            allergyLookup,
            membershipLookup,
            subscriptionHistory,
            sessionRevoker,
        ),
    };
}

export function setupUsersController(): UsersControllerSetup {
    const usersService = createMockUsersService();
    return { usersService, controller: new UsersController(usersService as unknown as UsersService) };
}

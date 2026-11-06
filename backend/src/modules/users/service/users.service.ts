import type { Clock } from "../../../shared/ports/clock/clock.js";
import type { Hasher } from "../../../shared/ports/hasher/hasher.js";
import { applyUserChanges } from "./apply-user-changes.js";
import { changePassword } from "./change-password.js";
import { countActiveUsers } from "./count-active-users.js";
import { createUser } from "./create-user.js";
import { filterActiveUserIds } from "./filter-active-user-ids.js";
import { getActiveById } from "./get-active-by-id.js";
import { getAllergyProfiles } from "./get-allergy-profiles.js";
import { getProfile } from "./get-profile.js";
import { getSummaries } from "./get-summaries.js";
import { getUser } from "./get-user.js";
import type { AllergyLookup } from "./interfaces/allergy-lookup.js";
import type { MembershipLookup } from "./interfaces/membership-lookup.js";
import type { SessionRevoker } from "./interfaces/session-revoker.js";
import type { SubscriptionHistory } from "./interfaces/subscription-history.js";
import type { UsersRepository } from "./interfaces/users.repository.js";
import { listActiveUserIds } from "./list-active-user-ids.js";
import { listUsers } from "./list-users.js";
import { toProfile, toUserDetail, toUserView } from "./present-user.js";
import { registerCustomer } from "./register-customer.js";
import { updateProfile } from "./update-profile.js";
import { updateUser } from "./update-user.js";
import { verifyCredentials } from "./verify-credentials.js";

export class UsersService {
    dummyPasswordHash: Promise<string> | undefined;

    constructor(
        readonly usersRepository: UsersRepository,
        readonly hasher: Hasher,
        readonly clock: Clock,
        readonly allergyLookup: AllergyLookup,
        readonly membershipLookup: MembershipLookup,
        readonly subscriptionHistory: SubscriptionHistory,
        readonly sessionRevoker?: SessionRevoker | undefined,
    ) {}

    createUser = createUser;
    registerCustomer = registerCustomer;
    verifyCredentials = verifyCredentials;
    getActiveById = getActiveById;
    getProfile = getProfile;
    updateProfile = updateProfile;
    changePassword = changePassword;
    listUsers = listUsers;
    listActiveUserIds = listActiveUserIds;
    countActiveUsers = countActiveUsers;
    filterActiveUserIds = filterActiveUserIds;
    getAllergyProfiles = getAllergyProfiles;
    getSummaries = getSummaries;
    getUser = getUser;
    updateUser = updateUser;
    applyUserChanges = applyUserChanges;
    toUserView = toUserView;
    toProfile = toProfile;
    toUserDetail = toUserDetail;
}

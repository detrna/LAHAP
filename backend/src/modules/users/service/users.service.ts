import type { Clock } from "../../../shared/ports/clock/clock.js";
import type { Hasher } from "../../../shared/ports/hasher/hasher.js";
import type { ObjectStorage } from "../../../shared/ports/object-storage/object-storage.js";
import { applyUserChanges } from "./apply-user-changes.js";
import { changePassword } from "./change-password.js";
import { createUser } from "./create-user.js";
import { getActiveById } from "./get-active-by-id.js";
import { getProfile } from "./get-profile.js";
import { getUser } from "./get-user.js";
import type { SessionRevoker } from "./interfaces/session-revoker.js";
import type { UsersRepository } from "./interfaces/users.repository.js";
import { listUsers } from "./list-users.js";
import { toMembership, toProfile, toUserDetail } from "./present-user.js";
import { registerCustomer } from "./register-customer.js";
import { updateProfile } from "./update-profile.js";
import { updateUser } from "./update-user.js";
import { verifyCredentials } from "./verify-credentials.js";

export class UsersService {
    dummyPasswordHash: Promise<string> | undefined;

    constructor(
        readonly usersRepository: UsersRepository,
        readonly hasher: Hasher,
        readonly objectStorage: ObjectStorage,
        readonly clock: Clock,
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
    getUser = getUser;
    updateUser = updateUser;
    applyUserChanges = applyUserChanges;
    toMembership = toMembership;
    toProfile = toProfile;
    toUserDetail = toUserDetail;
}

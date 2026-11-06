import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { UsersRepository } from "../../service/interfaces/users.repository.js";
import { create } from "./create.js";
import { existsByEmail, existsByPhone } from "./exists.js";
import { findById } from "./find-by-id.js";
import { findConflict } from "./find-conflict.js";
import { findCredentialsByEmail, findCredentialsById, findCredentialsByPhone } from "./find-credentials.js";
import { list } from "./list.js";
import { update } from "./update.js";
import { updatePasswordHash } from "./update-password-hash.js";

export class PrismaUsersRepository implements UsersRepository {
    constructor(readonly db: Db) {}

    findById = findById;
    findCredentialsByPhone = findCredentialsByPhone;
    findCredentialsByEmail = findCredentialsByEmail;
    findCredentialsById = findCredentialsById;
    existsByPhone = existsByPhone;
    existsByEmail = existsByEmail;
    findConflict = findConflict;
    create = create;
    update = update;
    updatePasswordHash = updatePasswordHash;
    list = list;
}

import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { UsersRepository } from "../../service/interfaces/users.repository.js";
import { create } from "./create.js";
import { existsByEmail, existsByPhone } from "./exists.js";
import { findById } from "./find-by-id.js";
import { findCredentialsByEmail, findCredentialsByPhone } from "./find-credentials.js";
import { findMissingAllergyIds } from "./find-missing-allergy-ids.js";

export class PrismaUsersRepository implements UsersRepository {
    constructor(readonly db: Db) {}

    findById = findById;
    findCredentialsByPhone = findCredentialsByPhone;
    findCredentialsByEmail = findCredentialsByEmail;
    existsByPhone = existsByPhone;
    existsByEmail = existsByEmail;
    findMissingAllergyIds = findMissingAllergyIds;
    create = create;
}

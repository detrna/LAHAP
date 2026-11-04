import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { AuthRepository } from "../../service/interfaces/auth.repository.js";
import { createRefreshToken } from "./create-refresh-token.js";
import { findRefreshToken } from "./find-refresh-token.js";
import { revokeRefreshToken, revokeRefreshTokensOfUser } from "./revoke-refresh-token.js";

export class PrismaAuthRepository implements AuthRepository {
    constructor(readonly db: Db) {}

    createRefreshToken = createRefreshToken;
    findRefreshToken = findRefreshToken;
    revokeRefreshToken = revokeRefreshToken;
    revokeRefreshTokensOfUser = revokeRefreshTokensOfUser;
}

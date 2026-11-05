import { toNumericOrNull } from "../../../../infrastructure/database/prisma/numeric.js";
import type { NewUserRecord, UserRecord } from "../../service/interfaces/users.repository.js";
import { UserAlreadyExistsError, UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import { usersWithAllergies } from "./queries.js";
import { toUserRecord } from "./to-user-record.js";
import { getUniqueUserField } from "./unique-violation.js";
import type { PrismaUsersRepository } from "./users-repository.js";

export async function create(this: PrismaUsersRepository, user: NewUserRecord): Promise<UserRecord> {
    try {
        return await this.db.transaction(async tx => {
            const created = await tx.orm.public.User.create({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: user.passwordHash,
                role: user.role,
                address: user.address,
                latitude: toNumericOrNull(user.latitude, 8),
                longitude: toNumericOrNull(user.longitude, 8),
                allergyNote: user.allergyNote,
                isActive: user.isActive,
            });
            if (user.allergyIds.length > 0) {
                await tx.orm.public.UserAllergy.createAll(
                    user.allergyIds.map(allergyId => ({ userId: created.id, allergyId })),
                );
            }
            const row = await usersWithAllergies(tx.orm).where({ id: created.id }).first();
            if (row === null) throw new Error(`user ${created.id} vanished inside its own transaction`);
            return toUserRecord(row);
        });
    } catch (cause) {
        const field = getUniqueUserField(cause);
        if (field !== null) throw new UserAlreadyExistsError(field, { cause });
        throw new UsersRepositoryFailureError("create", cause);
    }
}

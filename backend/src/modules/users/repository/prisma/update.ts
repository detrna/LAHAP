import { toNumericOrNull } from "../../../../infrastructure/database/prisma/numeric.js";
import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { LAST_ACTIVE_ADMIN_MESSAGE } from "../../domain/admin-access.js";
import type { UpdateUserOptions, UserChanges, UserRecord } from "../../service/interfaces/users.repository.js";
import { UserAlreadyExistsError, UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import { usersWithAllergies } from "./queries.js";
import { toUserRecord } from "./to-user-record.js";
import { getUniqueUserField } from "./unique-violation.js";
import type { PrismaUsersRepository } from "./users-repository.js";

const COORDINATE_SCALE = 8;

function toUserColumns(changes: UserChanges) {
    return {
        ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(changes.email !== undefined ? { email: changes.email } : {}),
        ...(changes.phone !== undefined ? { phone: changes.phone } : {}),
        ...(changes.passwordHash !== undefined ? { password: changes.passwordHash } : {}),
        ...(changes.role !== undefined ? { role: changes.role } : {}),
        ...(changes.address !== undefined ? { address: changes.address } : {}),
        ...(changes.latitude !== undefined ? { latitude: toNumericOrNull(changes.latitude, COORDINATE_SCALE) } : {}),
        ...(changes.longitude !== undefined ? { longitude: toNumericOrNull(changes.longitude, COORDINATE_SCALE) } : {}),
        ...(changes.allergyNote !== undefined ? { allergyNote: changes.allergyNote } : {}),
        ...(changes.isActive !== undefined ? { isActive: changes.isActive } : {}),
    };
}

export async function update(
    this: PrismaUsersRepository,
    id: string,
    changes: UserChanges,
    options: UpdateUserOptions = {},
): Promise<UserRecord | null> {
    try {
        return await this.db.transaction(async tx => {
            if (options.ensureActiveAdminRemains === true) {
                const activeAdmins = await tx.orm.public.User.where({ role: "ADMIN", isActive: true })
                    .select("id")
                    .forUpdate()
                    .all();
                if (activeAdmins.every(admin => admin.id === id)) {
                    throw new InvalidStateError(LAST_ACTIVE_ADMIN_MESSAGE);
                }
            }

            const columns = toUserColumns(changes);
            const target = tx.orm.public.User.where({ id }).select("id");
            const found = Object.keys(columns).length > 0 ? await target.update(columns) : await target.first();
            if (found === null) return null;

            if (options.allergyIds !== undefined) {
                await tx.orm.public.UserAllergy.where({ userId: id }).deleteAndCount();
                if (options.allergyIds.length > 0) {
                    await tx.orm.public.UserAllergy.createAll(
                        options.allergyIds.map(allergyId => ({ userId: id, allergyId })),
                    );
                }
            }

            const row = await usersWithAllergies(tx.orm).where({ id }).first();
            if (row === null) throw new Error(`user ${id} vanished inside its own transaction`);
            return toUserRecord(row);
        });
    } catch (cause) {
        if (cause instanceof InvalidStateError) throw cause;
        const field = getUniqueUserField(cause);
        if (field !== null) throw new UserAlreadyExistsError(field, { cause });
        throw new UsersRepositoryFailureError("update", cause);
    }
}
